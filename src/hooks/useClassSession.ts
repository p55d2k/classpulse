import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { readJoinContext } from "@/lib/classSession";
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
  const [joinedAt] = useState(Date.now());
  const [confettiBursts, setConfettiBursts] = useState<number[]>([]);
  const [removedFromClass, setRemovedFromClass] = useState(false);

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
    hub.onclose(() => setStatus("Disconnected"));

    hub.on("SendJoinClass", (payload: unknown) => {
      logger.info("SendJoinClass", payload);
      setMessages((m) => [
        ...m,
        { t: "SendJoinClass", payload, ts: Date.now() },
      ]);
      setEventsCount((c) => c + 1);
      if (typeof payload === "object" && payload !== null) {
        const p = payload as Record<string, unknown>;
        if (typeof p.participantPoints === "number") {
          setStars(p.participantPoints);
        }
      }
      const inShow = Boolean(
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>).isInSlideshow ??
              (payload as Record<string, unknown>).IsInSlideshow ??
              (payload as Record<string, unknown>).inSlideshow
          : false
      );
      setIsInSlideshow(inShow);
      if (!inShow) setSlide(null);
    });

    hub.on("SlideChanged", (payload: unknown) => {
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

    try {
      setStatus("Connecting...");
      await hub.start();
      setStatus("Connected");
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
    }
  }, []);

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
    startConnection();
  }, [startConnection]);

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
    setStars,
    setConfettiBursts,
    setSlideImageLoading,
  } as ClassSessionState & {
    setStars: typeof setStars;
    setConfettiBursts: typeof setConfettiBursts;
    setProfile: typeof setProfile;
    setSlideImageLoading: typeof setSlideImageLoading;
  };
}
