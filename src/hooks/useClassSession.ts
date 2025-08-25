import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { readJoinContext, persistJoinContext } from "@/lib/classSession";
import { logger } from "@/lib/logger";
import {
  ClassSessionState,
  SlideState,
  SessionMessage,
  PresenterProfile,
} from "@/types";

const levelThresholds = [0, 5, 10, 20, 30, 40, 50, 60, 80, 100];

export function useClassSession() {
  const [status, setStatus] = useState("Initializing");
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [slide, setSlide] = useState<SlideState | null>(null);
  const [slideImageLoading, setSlideImageLoading] = useState(false);
  const [isInSlideshow, setIsInSlideshow] = useState(false);
  const [stars, setStars] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [profile, setProfile] = useState<PresenterProfile | null>(null);
  const [justLeveled, setJustLeveled] = useState(false);
  const prevLevelRef = useRef(1);
  const firstLevelRef = useRef(true);
  const initialPointsAppliedRef = useRef(false);
  const [joinedAt] = useState(Date.now());
  const [confettiBursts, setConfettiBursts] = useState<number[]>([]);
  const [removedFromClass, setRemovedFromClass] = useState(false);
  const [duplicateConnection, setDuplicateConnection] = useState(false);
  const reconnectingOverrideRef = useRef(false);
  // Prevent duplicate SignalR connections (StrictMode / HMR double-invoke)
  const startedRef = useRef(false);
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const mountCountRef = useRef(0);
  const slideshowActiveRef = useRef(false);
  const [activity, setActivity] = useState<{
    id: string;
    type: string; // raw activityType from server
    mode: "mc" | "short" | "draw"; // derived client mode (draw = Slide Drawing)
    // Multiple Choice specific
    choices: string[];
    allowMultiple: boolean;
    correctAnswers: string[];
    // Shared: previously submitted selections (MC) or answers (Short Answer)
    submitted: string[];
    submittedDetails?: { responseId: string; data: string }[]; // short answer detailed submissions
    // Short Answer specific
    numAllowed?: number; // number of submissions allowed (default 1)
    captionRequired?: boolean | null;
    // Common meta
    slideUrl?: string;
    status?: string;
    reveal: boolean;
  } | null>(null);
  const [lastDeletedResponse, setLastDeletedResponse] = useState<{
    responseId: string;
    ts: number;
  } | null>(null);

  // No per-tab ownership logic needed anymore.

  // derived level
  const level = (() => {
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (stars >= levelThresholds[i]) return i + 1;
    }
    return 1;
  })();
  const nextThreshold =
    level < levelThresholds.length ? levelThresholds[level] : null;
  const currentBase = levelThresholds[level - 1];
  const levelProgress = nextThreshold
    ? (stars - currentBase) / (nextThreshold - currentBase)
    : 1;

  const startConnection = useCallback(async () => {
    // Reuse existing hub if present
    if (hubRef.current) {
      setConnection(hubRef.current);
      return;
    }
    // Guard against parallel starts
    if (startedRef.current) return;
    startedRef.current = true; // set before async work
    const ctx = readJoinContext();
    if (!ctx) return;
    const region = ctx.cpcsRegion;
    const baseUrl = `wss://${region}.classpoint.app/classsession`;
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(baseUrl, {
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => 1500 })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    hub.onreconnecting(() => setStatus("Reconnecting..."));
    hub.onreconnected(() => setStatus("Connected"));
    hub.onclose(() => {
      setStatus("Disconnected");
      if (hubRef.current === hub) {
        hubRef.current = null;
        startedRef.current = false;
      }
    });

    hub.on("SendJoinClass", (payload: unknown) => {
      logger.info("SendJoinClass", payload);
      setMessages((m) => [
        ...m,
        { t: "SendJoinClass", payload, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      if (typeof payload === "object" && payload !== null) {
        const p = payload as Record<string, unknown>;
        // Check for both participantPoints and participantTotalPoints
        let newStars = 0;
        if (typeof p.participantPoints === "number") {
          newStars += p.participantPoints;
        }
        if (typeof p.participantTotalPoints === "number") {
          newStars += p.participantTotalPoints;
        }
        if (newStars > 0) {
          setStars(newStars);
          // Suppress level-up animation for the very first authoritative points sync
          if (!initialPointsAppliedRef.current) {
            // Derive level we are jumping to and lock prev refs
            let derivedLevel = 1;
            for (let i = levelThresholds.length - 1; i >= 0; i--) {
              if (newStars >= levelThresholds[i]) {
                derivedLevel = i + 1;
                break;
              }
            }
            prevLevelRef.current = derivedLevel; // baseline
            firstLevelRef.current = false;
            initialPointsAppliedRef.current = true;
          }
        }

        // Override any previously persisted participant identity details with authoritative server values.
        try {
          const existingCtx = readJoinContext();
          // Helper to fetch either camelCase or PascalCase property names without using 'any'.
          const readStringProp = (
            obj: Record<string, unknown>,
            key: string
          ): string | undefined => {
            const direct = obj[key];
            if (typeof direct === "string") return direct;
            const pascal = obj[`${key[0].toUpperCase()}${key.slice(1)}`];
            return typeof pascal === "string" ? pascal : undefined;
          };
          const participantId = readStringProp(p, "participantId");
          const participantName = readStringProp(p, "participantName");
          const participantUsername = readStringProp(p, "participantUsername");
          const classSessionId = readStringProp(p, "classSessionId");
          if (existingCtx) {
            let changed = false;
            const updated = { ...existingCtx };
            if (participantId && participantId !== existingCtx.participantId) {
              updated.participantId = participantId;
              changed = true;
            }
            if (
              participantName &&
              participantName !== existingCtx.participantName
            ) {
              updated.participantName = participantName;
              changed = true;
            }
            if (
              participantUsername &&
              participantUsername !== existingCtx.participantUsername
            ) {
              updated.participantUsername = participantUsername;
              changed = true;
            }
            if (
              classSessionId &&
              classSessionId !== existingCtx.classSessionId &&
              classSessionId.trim() !== ""
            ) {
              updated.classSessionId = classSessionId;
              changed = true;
            }
            if (changed) {
              persistJoinContext(updated);
              logger.info("Participant identity updated from SendJoinClass", {
                participantId: updated.participantId,
                participantName: updated.participantName,
                participantUsername: updated.participantUsername,
                classSessionId: updated.classSessionId,
              });
            }
          }
        } catch (e) {
          logger.warn(
            "Failed to update participant identity from SendJoinClass",
            e
          );
        }

        // If an activity is already in progress when we join, initialize it here.
        const activityModel = p.activityModel as
          | Record<string, unknown>
          | undefined;
        if (activityModel && typeof activityModel === "object") {
          try {
            const actType = String(activityModel.activityType || "");
            if (actType === "Short Answer") {
              // Short Answer parsing
              let submitted: string[] = [];
              let submittedDetails: { responseId: string; data: string }[] = [];
              let alreadySubmitted = false;
              const joinCtx = readJoinContext();
              if (Array.isArray(activityModel.yourSubmittedResponses)) {
                for (const r of activityModel.yourSubmittedResponses as unknown[]) {
                  if (typeof r === "object" && r && !Array.isArray(r)) {
                    const ro = r as Record<string, unknown>;
                    const rPid =
                      typeof ro.participantId === "string"
                        ? ro.participantId
                        : undefined;
                    const rPname =
                      typeof ro.participantName === "string"
                        ? ro.participantName
                        : undefined;
                    const matches =
                      (joinCtx && rPid && rPid === joinCtx.participantId) ||
                      (joinCtx && rPname && rPname === joinCtx.participantName);
                    if (matches) {
                      const raw = ro.responseData;
                      if (typeof raw === "string") {
                        try {
                          const parsed = JSON.parse(raw);
                          if (Array.isArray(parsed))
                            submitted = parsed.map((c) => String(c));
                          else if (parsed) submitted = [String(parsed)];
                        } catch {
                          submitted = [raw];
                        }
                      }
                      // responseId support
                      const respId =
                        typeof ro.responseId === "string"
                          ? ro.responseId
                          : Array.isArray(ro.responseIds) &&
                            typeof ro.responseIds[0] === "string"
                          ? (ro.responseIds[0] as string)
                          : undefined;
                      submittedDetails = submitted.map((d, idx) => ({
                        responseId: respId || `legacy-${idx}`,
                        data: d,
                      }));
                      alreadySubmitted = submitted.length > 0;
                      break;
                    }
                  }
                }
              }
              setActivity({
                id: String(activityModel.activityId || ""),
                type: actType,
                mode: "short",
                choices: [],
                allowMultiple: false,
                correctAnswers: [],
                submitted,
                submittedDetails,
                numAllowed:
                  typeof activityModel.numOfSubmissionsAllowed === "number"
                    ? activityModel.numOfSubmissionsAllowed
                    : 1,
                captionRequired: (activityModel as Record<string, unknown>)
                  .isCaptionRequired as boolean | null | undefined,
                slideUrl:
                  typeof activityModel.activitySlideUrl === "string"
                    ? (activityModel.activitySlideUrl as string)
                    : undefined,
                status: alreadySubmitted
                  ? "submitted"
                  : typeof activityModel.activityStatus === "string"
                  ? (activityModel.activityStatus as string)
                  : undefined,
                reveal: false,
              });
            } else if (actType === "Slide Drawing") {
              // Slide Drawing parsing (behaves like one submission allowed by default)
              let alreadySubmitted = false;
              let submitted: string[] = [];
              if (Array.isArray(activityModel.yourSubmittedResponses)) {
                for (const r of activityModel.yourSubmittedResponses as unknown[]) {
                  if (typeof r === "object" && r && !Array.isArray(r)) {
                    const ro = r as Record<string, unknown>;
                    const raw = ro.responseData;
                    if (typeof raw === "string" && raw) {
                      submitted = [raw]; // expected to be URL to PNG
                      alreadySubmitted = true;
                      break;
                    }
                  }
                }
              }
              setActivity({
                id: String(activityModel.activityId || ""),
                type: actType,
                mode: "draw",
                choices: [],
                allowMultiple: false,
                correctAnswers: [],
                submitted,
                slideUrl:
                  typeof activityModel.activitySlideUrl === "string"
                    ? (activityModel.activitySlideUrl as string)
                    : undefined,
                status: alreadySubmitted
                  ? "submitted"
                  : typeof activityModel.activityStatus === "string"
                  ? (activityModel.activityStatus as string)
                  : undefined,
                reveal: false,
              });
            } else {
              // Multiple Choice parsing (existing)
              const mcChoices = Array.isArray(activityModel.mcChoices)
                ? (activityModel.mcChoices as unknown[]).map((c) => String(c))
                : [];
              const allowMulti = Boolean(activityModel.mcIsAllowSelectMultiple);
              const correct = Array.isArray(activityModel.mcCorrectAnswers)
                ? (activityModel.mcCorrectAnswers as unknown[]).map((c) =>
                    String(c)
                  )
                : [];
              let submitted: string[] = [];
              let alreadySubmitted = false;
              const joinCtx = readJoinContext();
              if (Array.isArray(activityModel.yourSubmittedResponses)) {
                for (const r of activityModel.yourSubmittedResponses as unknown[]) {
                  if (typeof r === "object" && r && !Array.isArray(r)) {
                    const ro = r as Record<string, unknown>;
                    const rPid =
                      typeof ro.participantId === "string"
                        ? ro.participantId
                        : undefined;
                    const rPname =
                      typeof ro.participantName === "string"
                        ? ro.participantName
                        : undefined;
                    const matches =
                      (joinCtx && rPid && rPid === joinCtx.participantId) ||
                      (joinCtx && rPname && rPname === joinCtx.participantName);
                    if (matches) {
                      const raw = ro.responseData;
                      if (typeof raw === "string") {
                        try {
                          const parsed = JSON.parse(raw);
                          if (Array.isArray(parsed))
                            submitted = parsed.map((c) => String(c));
                        } catch {}
                      }
                      alreadySubmitted = true;
                      break;
                    }
                  }
                }
              }
              setActivity({
                id: String(activityModel.activityId || ""),
                type: actType,
                mode: "mc",
                choices: mcChoices,
                allowMultiple: allowMulti,
                correctAnswers: correct,
                submitted,
                slideUrl:
                  typeof activityModel.activitySlideUrl === "string"
                    ? (activityModel.activitySlideUrl as string)
                    : undefined,
                status: alreadySubmitted
                  ? "submitted"
                  : typeof activityModel.activityStatus === "string"
                  ? (activityModel.activityStatus as string)
                  : undefined,
                reveal: false,
              });
            }
          } catch (e) {
            logger.warn("Failed to parse activityModel from SendJoinClass", e);
          }
        }
      }
      const inShow = Boolean(
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>).isInSlideshow ??
              (payload as Record<string, unknown>).IsInSlideshow ??
              (payload as Record<string, unknown>).inSlideshow
          : false
      );
      slideshowActiveRef.current = inShow;
      setIsInSlideshow(inShow);
      if (!inShow) setSlide(null);
      // Duplicate connection modal now only managed by explicit server event.
    });

    hub.on("SlideChanged", (payload: unknown) => {
      if (!slideshowActiveRef.current) {
        // Ignore slide updates when slideshow is not active per latest SendJoinClass / EndSlideshow.
        return;
      }
      logger.info("SlideChanged", payload);
      setMessages((m) => [
        ...m,
        { t: "SlideChanged", payload, ts: Date.now() },
      ]);
      const p =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : {};
      const idx =
        Number(
          p.currentSlideIndex ?? p.SlideIndex ?? p.slideIndex ?? p.index ?? 0
        ) + 1;
      const title = (p.Title as string) || (p.title as string) || undefined;
      const imageUrl =
        (p.imageUrl as string) || (p.ImageUrl as string) || undefined;
      const totalSlideCount =
        Number(p.totalSlideCount || p.TotalSlideCount || p.slideCount || 0) ||
        undefined;
      setIsInSlideshow(true);
      setSlideImageLoading(!!imageUrl);
      setSlide({ index: idx, title, imageUrl, totalSlideCount });
      setEventsCount((c) => c + 1);
    });

    hub.on("GotPoints", (points: unknown) => {
      const amount = Array.isArray(points)
        ? Number(points[0]) || 0
        : Number(points) || 0;
      logger.info("GotPoints", { amount, raw: points });
      setStars((s) => s + amount);
      setMessages((m) => [
        ...m,
        { t: "GotPoints", payload: { amount }, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      setConfettiBursts((b) => [...b, Date.now()]);
    });

    // Explicit slideshow end
    hub.on("PresenterEndSlideshow", () => {
      logger.info("PresenterEndSlideshow received");
      setMessages((m) => [
        ...m,
        { t: "PresenterEndSlideshow", payload: {}, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      setIsInSlideshow(false);
      setSlide(null);
      slideshowActiveRef.current = false;
    });

    // Explicit slideshow start (may precede SlideChanged events)
    hub.on("PresenterStartSlideShow", (payload: unknown) => {
      logger.info("PresenterStartSlideShow received", payload);
      setMessages((m) => [
        ...m,
        { t: "PresenterStartSlideShow", payload, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      setIsInSlideshow(true);
      slideshowActiveRef.current = true;
      // Try to derive initial slide context immediately for smoother UX
      if (typeof payload === "object" && payload !== null) {
        const p = payload as Record<string, unknown>;
        const showRaw =
          (p.currentSlideshow as unknown) ||
          (p.currentSlideshowDto as unknown) ||
          (p.slideshow as unknown);
        if (showRaw && typeof showRaw === "object") {
          interface SlideShowLike {
            totalSlideCount?: number;
            slideCount?: number;
            currentSlideIndex?: number;
            imageUrl?: string;
            currentImageUrl?: string;
          }
          const show = showRaw as SlideShowLike;
          const total =
            Number((show.totalSlideCount ?? show.slideCount ?? 0) as number) ||
            undefined;
          const currentIndex = Number(show.currentSlideIndex ?? 0);
          const idx = currentIndex + 1; // 1-based for UI
          const imageUrl: string | undefined =
            show.imageUrl || show.currentImageUrl || undefined;
          setSlideImageLoading(!!imageUrl);
          setSlide({
            index: idx,
            title: undefined,
            imageUrl,
            totalSlideCount: total,
          });
        }
      }
    });

    hub.on("ActivityStarted", (payload: unknown) => {
      logger.info("ActivityStarted", payload);
      setMessages((m) => [
        ...m,
        { t: "ActivityStarted", payload, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      if (typeof payload === "object" && payload !== null) {
        const p = payload as Record<string, unknown>;
        // Explicitly clear any existing activity before loading the new one.
        setActivity(null);
        const actType = String(p.activityType || "");
        if (actType === "Short Answer") {
          // Short Answer
          let submitted: string[] = [];
          let submittedDetails: { responseId: string; data: string }[] = [];
          if (Array.isArray(p.yourSubmittedResponses)) {
            for (const r of p.yourSubmittedResponses as unknown[]) {
              if (typeof r === "object" && r && !Array.isArray(r)) {
                const ro = r as Record<string, unknown>;
                const raw = ro.responseData;
                if (typeof raw === "string") {
                  try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed))
                      submitted = parsed.map((c) => String(c));
                    else if (parsed) submitted = [String(parsed)];
                  } catch {
                    submitted = [raw];
                  }
                }
                const respId =
                  typeof ro.responseId === "string"
                    ? ro.responseId
                    : Array.isArray(ro.responseIds) &&
                      typeof ro.responseIds[0] === "string"
                    ? (ro.responseIds[0] as string)
                    : undefined;
                submittedDetails = submitted.map((d, idx) => ({
                  responseId: respId || `legacy-${idx}`,
                  data: d,
                }));
              }
            }
          }
          setActivity({
            id: String(p.activityId || ""),
            type: actType,
            mode: "short",
            choices: [],
            allowMultiple: false,
            correctAnswers: [],
            submitted,
            submittedDetails,
            numAllowed:
              typeof p.numOfSubmissionsAllowed === "number"
                ? (p.numOfSubmissionsAllowed as number)
                : 1,
            captionRequired: p.hasOwnProperty("isCaptionRequired")
              ? (p.isCaptionRequired as boolean | null | undefined)
              : undefined,
            slideUrl:
              typeof p.activitySlideUrl === "string"
                ? (p.activitySlideUrl as string)
                : undefined,
            status:
              typeof p.activityStatus === "string"
                ? (p.activityStatus as string)
                : undefined,
            reveal: false,
          });
        } else if (actType === "Slide Drawing") {
          let alreadySubmitted = false;
          let submitted: string[] = [];
          if (Array.isArray(p.yourSubmittedResponses)) {
            for (const r of p.yourSubmittedResponses as unknown[]) {
              if (typeof r === "object" && r && !Array.isArray(r)) {
                const ro = r as Record<string, unknown>;
                const raw = ro.responseData;
                if (typeof raw === "string" && raw) {
                  submitted = [raw];
                  alreadySubmitted = true;
                  break;
                }
              }
            }
          }
          setActivity({
            id: String(p.activityId || ""),
            type: actType,
            mode: "draw",
            choices: [],
            allowMultiple: false,
            correctAnswers: [],
            submitted,
            slideUrl:
              typeof p.activitySlideUrl === "string"
                ? (p.activitySlideUrl as string)
                : undefined,
            status: alreadySubmitted
              ? "submitted"
              : typeof p.activityStatus === "string"
              ? (p.activityStatus as string)
              : undefined,
            reveal: false,
          });
        } else {
          // Multiple Choice (existing)
          const mcChoices = Array.isArray(p.mcChoices)
            ? (p.mcChoices as unknown[]).map((c) => String(c))
            : [];
          const allowMulti = Boolean(p.mcIsAllowSelectMultiple);
          const correct = Array.isArray(p.mcCorrectAnswers)
            ? (p.mcCorrectAnswers as unknown[]).map((c) => String(c))
            : [];
          const submitted = Array.isArray(p.yourSubmittedResponses)
            ? (p.yourSubmittedResponses as unknown[]).map((c) => String(c))
            : [];
          setActivity({
            id: String(p.activityId || ""),
            type: actType,
            mode: "mc",
            choices: mcChoices,
            allowMultiple: allowMulti,
            correctAnswers: correct,
            submitted,
            slideUrl:
              typeof p.activitySlideUrl === "string"
                ? p.activitySlideUrl
                : undefined,
            status:
              typeof p.activityStatus === "string"
                ? p.activityStatus
                : undefined,
            reveal: false,
          });
        }
      }
    });

    hub.on("ActivityEnded", () => {
      logger.info("ActivityEnded received");
      setMessages((m) => [
        ...m,
        { t: "ActivityEnded", payload: {}, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      setActivity(null);
    });

    hub.on("CorrectAnswerShown", (flag: unknown) => {
      const revealFlag = Boolean(flag);
      logger.info("CorrectAnswerShown", { reveal: revealFlag });
      setMessages((m) => [
        ...m,
        {
          t: "CorrectAnswerShown",
          payload: { reveal: revealFlag },
          ts: Date.now(),
        },
      ]);
      setEventsCount((c) => c + 1);
      setActivity((a) => (a ? { ...a, reveal: revealFlag } : a));
    });

    // ActivityClosed: server no longer accepts submissions for current activity
    hub.on("ActivityClosed", () => {
      logger.info("ActivityClosed received");
      setMessages((m) => [
        ...m,
        { t: "ActivityClosed", payload: {}, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      setActivity((a) =>
        a
          ? {
              ...a,
              // Preserve 'submitted' if participant already submitted; otherwise mark closed
              status: a.status === "submitted" ? a.status : "closed",
            }
          : a
      );
    });

    hub.on("RemovedFromClass", () => {
      logger.warn("RemovedFromClass received; ending session");
      setMessages((m) => [
        ...m,
        { t: "RemovedFromClass", payload: {}, ts: Date.now() },
      ]);
      setRemovedFromClass(true);
      setStatus("Removed");
      // stop connection proactively
      try {
        hub.stop();
      } catch {}
    });

    // Custom event: another tab made the connection
    hub.on("ConnectionMadeOnAnotherTab", () => {
      logger.warn("ConnectionMadeOnAnotherTab received");
      hub.on("DeletedResponse", (payload: unknown) => {
        // This event removes a previously submitted response (short answer)
        if (!payload || typeof payload !== "object") return;
        const p = payload as Record<string, unknown>;
        const responseId =
          typeof p.responseId === "string" ? p.responseId : undefined;
        const participantId =
          typeof p.participantId === "string" ? p.participantId : undefined;
        if (!responseId) return;
        const ctx = readJoinContext();
        if (participantId && ctx && participantId !== ctx.participantId) return; // ignore others
        setActivity((a) => {
          if (!a || a.mode !== "short" || !a.submittedDetails) return a;
          const filteredDetails = a.submittedDetails.filter(
            (d) => d.responseId !== responseId
          );
          if (filteredDetails.length === a.submittedDetails.length) return a;
          return {
            ...a,
            submittedDetails: filteredDetails,
            submitted: filteredDetails.map((d) => d.data),
            status: filteredDetails.length === 0 ? undefined : a.status,
          };
        });
        setLastDeletedResponse({ responseId, ts: Date.now() });
      });
      setMessages((m) => [
        ...m,
        { t: "ConnectionMadeOnAnotherTab", payload: {}, ts: Date.now() },
      ]);
      // Show modal immediately when server notifies.
      setDuplicateConnection(true);
    });

    try {
      setStatus("Connecting...");
      await hub.start();
      setStatus("Connected");
      hubRef.current = hub;
      setConnection(hub);
      const ctx2 = readJoinContext();
      if (ctx2) {
        await hub.invoke("ParticipantStartup", {
          participantUsername: ctx2.participantUsername,
          participantName: ctx2.participantName,
          participantId: ctx2.participantId,
          participantAvatar: "",
          cpcsRegion: ctx2.cpcsRegion,
          presenterEmail: ctx2.presenterEmail,
          classSessionId: ctx2.classSessionId || "",
        });
      }
    } catch (e: unknown) {
      logger.error("Failed to start SignalR", e);
      setStatus("Failed");
      if (!hubRef.current) startedRef.current = false; // allow retry
    }
  }, []);

  // Removed ownership negotiation: modal only appears from explicit server signal.

  const forceReconnect = useCallback(async () => {
    if (reconnectingOverrideRef.current) return;
    reconnectingOverrideRef.current = true;
    setStatus("Reconnecting...");
    try {
      if (hubRef.current) await hubRef.current.stop();
    } catch {}
    setConnection(null);
    hubRef.current = null;
    setDuplicateConnection(false);
    reconnectingOverrideRef.current = false;
    startedRef.current = false;
    await startConnection();
  }, [startConnection]);

  const submitActivityChoices = useCallback((choices: string[]) => {
    setActivity((a) => (a ? { ...a, submitted: choices } : a));
  }, []);
  const toggleActivityReveal = useCallback(() => {
    setActivity((a) => (a ? { ...a, reveal: !a.reveal } : a));
  }, []);

  const submitActivityResponse = useCallback(
    (choices: string[]) => {
      if (!activity || !hubRef.current || choices.length === 0) return;
      try {
        const ctx = readJoinContext();
        const responseId =
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)) || Date.now().toString();
        const payload = {
          presenterEmail: ctx?.presenterEmail || "",
          participantId: ctx?.participantId || "",
          participantName:
            ctx?.participantName || ctx?.participantUsername || "",
          participantAvatar: "",
          activityId: activity.id,
          activityType: activity.type,
          responseId: `resp-${responseId}`,
          responseData: JSON.stringify(choices), // maintain array contract for both MC & Short Answer
        };
        hubRef.current.invoke("SubmitResponse", payload).catch(() => {});
        // Mark submitted (for Short Answer respect numAllowed: if more submissions allowed keep status 'submitting')
        setActivity((a) => {
          if (!a) return a;
          const numAllowed = a.numAllowed ?? 1;
          const total = a.submitted.length;
          const nextCount = total + choices.length; // choices may be a single answer or selections
          const done = nextCount >= numAllowed;
          return {
            ...a,
            status: done ? "submitted" : a.status || "submitting",
          };
        });
      } catch (e) {
        logger.warn("SubmitResponse invoke failed", e);
      }
    },
    [activity]
  );

  // Short Answer raw HTML submission (responseData is raw HTML string, not JSON array)
  const submitShortAnswer = useCallback(
    (html: string) => {
      if (!activity || activity.mode !== "short" || !hubRef.current) return;
      const trimmed = html.trim();
      if (!trimmed) return;
      try {
        const ctx = readJoinContext();
        const responseId =
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)) || Date.now().toString();
        const payload = {
          presenterEmail: ctx?.presenterEmail || "",
          participantId: ctx?.participantId || "",
          participantName:
            ctx?.participantName || ctx?.participantUsername || "",
          participantAvatar: "",
          activityId: activity.id,
          activityType: activity.type,
          responseId: `resp-${responseId}`,
          responseData: trimmed, // raw HTML per platform expectation
        };
        hubRef.current.invoke("SubmitResponse", payload).catch(() => {});
        setActivity((a) => {
          if (!a) return a;
          const numAllowed = a.numAllowed ?? 1;
          const nextSubmitted = [...a.submitted, trimmed];
          const nextDetails = [
            ...(a.submittedDetails || []),
            { responseId: `resp-${responseId}`, data: trimmed },
          ];
          const done = nextSubmitted.length >= numAllowed;
          return {
            ...a,
            submitted: nextSubmitted,
            submittedDetails: nextDetails,
            status: done ? "submitted" : a.status || "submitting",
          };
        });
      } catch (e) {
        logger.warn("SubmitResponse (short answer html) failed", e);
      }
    },
    [activity]
  );

  // Handle deletion of a previously submitted short answer response
  useEffect(() => {
    const hub = hubRef.current;
    if (!hub) return;
    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const p = payload as Record<string, unknown>;
      const responseId =
        typeof p.responseId === "string" ? p.responseId : undefined;
      const participantId =
        typeof p.participantId === "string" ? p.participantId : undefined;
      if (!responseId) return;
      const ctx = readJoinContext();
      if (participantId && ctx && participantId !== ctx.participantId) return; // only affect our own submissions
      setActivity((a) => {
        if (!a || a.mode !== "short") return a;
        if (!a.submittedDetails || a.submittedDetails.length === 0) return a;
        const filteredDetails = a.submittedDetails.filter(
          (d) => d.responseId !== responseId
        );
        if (filteredDetails.length === a.submittedDetails.length) return a; // no change
        const filteredSubmitted = filteredDetails.map((d) => d.data);
        return {
          ...a,
          submittedDetails: filteredDetails,
          submitted: filteredSubmitted,
          status: filteredSubmitted.length === 0 ? undefined : a.status,
        };
      });
    };
    hub.on("DeletedResponse", handler);
    return () => {
      hub.off("DeletedResponse", handler);
    };
  }, []);

  // No ownership to release now.

  // monitor level ups
  useEffect(() => {
    // Skip animation for the very first derived level after join
    if (firstLevelRef.current) {
      firstLevelRef.current = false;
      prevLevelRef.current = level;
      return; // no animation on initial load
    }
    const prev = prevLevelRef.current;
    if (level > prev) {
      setJustLeveled(true);
      const to = setTimeout(() => setJustLeveled(false), 2800);
      prevLevelRef.current = level;
      return () => clearTimeout(to);
    }
    if (level !== prev) {
      setJustLeveled(false);
      prevLevelRef.current = level;
    }
  }, [level]);

  useEffect(() => {
    mountCountRef.current++;
    const initialMountIndex = mountCountRef.current; // capture snapshot
    startConnection();
    return () => {
      // Only decrement if we're cleaning up the same mount instance
      const mountIndexSnapshot = initialMountIndex;
      if (mountCountRef.current === mountIndexSnapshot) {
        mountCountRef.current--;
      }
      if (mountCountRef.current <= 0) {
        const h = hubRef.current;
        hubRef.current = null;
        startedRef.current = false;
        if (h) {
          try {
            h.stop().catch(() => {});
          } catch {}
        }
      }
    };
  }, [startConnection]);

  // Slide Drawing submission: accepts a Blob (PNG) -> converts to data URL then invokes SubmitResponse.
  const submitSlideDrawing = useCallback(
    async (blob: Blob) => {
      if (!activity || activity.mode !== "draw" || !hubRef.current) return;
      try {
        // Convert blob to base64 data URL
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(blob);
        });
        const ctx = readJoinContext();
        const responseId =
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)) || Date.now().toString();
        const payload = {
          presenterEmail: ctx?.presenterEmail || "",
          participantId: ctx?.participantId || "",
          participantName:
            ctx?.participantName || ctx?.participantUsername || "",
          participantAvatar: "",
          activityId: activity.id,
          activityType: activity.type,
          responseId: `resp-${responseId}`,
          responseData: dataUrl, // embed PNG as data URL; server expected to accept a URL - this can be changed to upload flow later
        };
        hubRef.current.invoke("SubmitResponse", payload).catch(() => {});
        setActivity((a) =>
          a
            ? {
                ...a,
                submitted: [dataUrl],
                status: "submitted",
              }
            : a
        );
      } catch (e) {
        logger.warn("SubmitResponse (slide drawing) failed", e);
      }
    },
    [activity]
  );

  return {
    status,
    messages,
    slide,
    isInSlideshow,
    stars,
    eventsCount,
    connection,
    profile,
    setProfile,
    justLeveled,
    level,
    nextThreshold,
    levelProgress,
    joinedAt,
    slideImageLoading,
    confettiBursts,
    removedFromClass,
    duplicateConnection,
    forceReconnect,
    activity,
    submitActivityChoices,
    toggleActivityReveal,
    submitActivityResponse,
    submitShortAnswer,
    setStars,
    setConfettiBursts,
    setSlideImageLoading,
    lastDeletedResponse,
    submitSlideDrawing,
  } as ClassSessionState & {
    setStars: typeof setStars;
    setConfettiBursts: typeof setConfettiBursts;
    setProfile: typeof setProfile;
    setSlideImageLoading: typeof setSlideImageLoading;
    duplicateConnection: boolean;
    forceReconnect: () => Promise<void>;
    activity: typeof activity;
    submitActivityChoices: typeof submitActivityChoices;
    toggleActivityReveal: typeof toggleActivityReveal;
    submitActivityResponse: typeof submitActivityResponse;
    submitShortAnswer: typeof submitShortAnswer;
    lastDeletedResponse: typeof lastDeletedResponse;
    submitSlideDrawing: typeof submitSlideDrawing;
  };
}
