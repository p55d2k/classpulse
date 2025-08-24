"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { readJoinContext, clearJoinContext } from "@/lib/classSession";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogPanel } from "@/components/log-panel";
import { useClassSession } from "@/hooks/useClassSession";
import { logger } from "@/lib/logger";
import { StarsRankDisplay } from "@/components/class/StarsRankDisplay";
import { SlideViewer } from "@/components/class/SlideViewer";
import { RealtimeFeed } from "@/components/class/RealtimeFeed";
import { PresenterCard } from "@/components/class/PresenterCard";
import { ParticipantCard } from "@/components/class/ParticipantCard";
import { SessionStats } from "@/components/class/SessionStats";
import { ContextCard } from "@/components/class/ContextCard";
import { ActivityPanel } from "@/components/class/ActivityPanel";
import "@/styles/levelUp.css";

export default function ClassPage() {
  const truncate = (value: string | undefined | null, limit = 30) => {
    if (!value) return value || "";
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
  };
  const {
    status,
    messages,
    slide,
    isInSlideshow,
    stars,
    eventsCount,
    connection,
    profile,
    setProfile,
    level,
    nextThreshold,
    levelProgress,
    joinedAt,
    slideImageLoading,
    confettiBursts,
    removedFromClass,
    justLeveled,
    duplicateConnection,
    forceReconnect,
    activity,
    submitActivityChoices,
    toggleActivityReveal,
    submitActivityResponse,
  } = useClassSession();
  const router = useRouter();
  const [removedToastVisible, setRemovedToastVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Validate join context on first mount; redirect home if invalid
  useEffect(() => {
    const ctx = readJoinContext();
    if (!ctx || !ctx.classCode || !ctx.participantId || !ctx.presenterEmail) {
      clearJoinContext();
      router.replace("/");
    }
  }, [router]);

  // React to being removed from class
  useEffect(() => {
    if (removedFromClass) {
      try {
        connection?.stop();
      } catch {}
      setRemovedToastVisible(true);
      // redirect after brief delay so user sees message
      const to = setTimeout(() => {
        clearJoinContext();
        router.replace("/");
      }, 2600);
      return () => clearTimeout(to);
    }
  }, [removedFromClass, connection, router]);

  // Fetch presenter profile (now separate from connection logic)
  useEffect(() => {
    const ctx = readJoinContext();
    if (!ctx) return;
    (async () => {
      try {
        const email = ctx.presenterEmail;
        if (!email) return;
        const res = await fetch(
          `/api/participant-app?email=${encodeURIComponent(email)}`,
          { method: "GET", cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data || json;
        const normalized = {
          firstName: data.firstName || data.givenName || "user",
          lastName: data.lastName || data.surname || "user",
          avatarUrl: data.avatarUrl || data.photoUrl || "",
          organization: data.organization || data.org || "",
          isCCT: Boolean(data.isCCT),
          isCCE: Boolean(data.isCCE),
          isCSC: Boolean(data.isCSC),
          isOnPro: Boolean(data.isOnPro),
          isOnPremium: Boolean(data.isOnPremium),
        };
        setProfile(normalized);
        try {
          localStorage.setItem(
            "participantProfile",
            JSON.stringify(normalized)
          );
        } catch {}
      } catch {}
    })();
  }, [setProfile]);

  // Manage fade-in for duplicate connection modal
  useEffect(() => {
    if (duplicateConnection && !removedFromClass) {
      // next frame ensures transition runs
      requestAnimationFrame(() => setModalVisible(true));
    } else {
      setModalVisible(false);
    }
  }, [duplicateConnection, removedFromClass]);

  // Old overlay lifecycle removed; new animation self-contained via CSS keyframes.

  const handleLeave = () => {
    const ctx = readJoinContext();
    const doStop = () => {
      try {
        connection?.stop();
      } catch {}
      clearJoinContext();
      router.replace("/");
    };
    if (connection && ctx) {
      // Build payload mirroring the observed leave message structure
      const payload = {
        deviceId: ctx.participantId, // using participantId as deviceId analogous to sample
        classCode: ctx.classCode,
        presenterEmail: ctx.presenterEmail,
        cpcsRegion: ctx.cpcsRegion,
        savedParticipantsForJoin: [],
        participantId: ctx.participantId,
        participantUsername: ctx.participantUsername,
        participantName: ctx.participantName,
        participantAvatar: "", // not tracked yet
        participantPoints: 0, // no points tracking yet
        participantTotalPoints: 0,
        pointsBeingAdded: 0,
        isFromSavedClass: false,
        groupId: null,
        language: "en",
        isAddingPoints: false,
      };
      try {
        logger.debug("Invoking ParticipantLeaveClass", payload);
        connection
          .invoke("ParticipantLeaveClass", payload)
          .catch((e: unknown) => logger.warn("Leave invoke failed", e))
          .finally(() => {
            logger.info("Participant left class");
            doStop();
          });
        return; // wait for promise chain
      } catch (e) {
        logger.error("Error invoking leave", e);
      }
    }
    logger.info("Participant left class (no active connection)");
    doStop();
  };

  const ctx = readJoinContext();
  const sessionDurationSec = Math.floor((Date.now() - joinedAt) / 1000);
  const formattedDuration = `${Math.floor(sessionDurationSec / 60)}m ${
    sessionDurationSec % 60
  }s`;
  // Points metric removed (was prototype pseudoPoints)

  const levelOverlayStyle = useMemo(() => {
    // Derive a hue from level (wrap around 0-360) and build tints
    const hue = (level * 37) % 360; // 37 gives good distribution
    const light = (l: number) => `hsl(${hue} 100% ${l}% / 1)`;
    return {
      ["--lu-grad-1"]: light(92),
      ["--lu-grad-2"]: light(80),
      ["--lu-grad-3"]: light(68),
      ["--lu-ring-border"]: `hsl(${hue} 85% 78% / 0.4)`,
      ["--lu-ring-border-secondary"]: `hsl(${hue} 85% 78% / 0.22)`,
      ["--lu-part-1"]: light(88),
      ["--lu-part-2"]: light(70),
    } as React.CSSProperties; // custom properties allowed
  }, [level]);

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4 relative">
      {/* Level Up Full-Screen Overlay */}
      {justLeveled && !removedFromClass && (
        <div
          className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center lu-container"
          style={levelOverlayStyle}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(25,25,25,0.4),rgba(0,0,0,0.85))] lu-overlay" />
          <div className="relative flex flex-col items-center justify-center select-none">
            <div className="lu-ring" />
            <div className="lu-ring secondary" />
            <div className="lu-particles">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    left: `${50 + (Math.random() * 60 - 30)}%`,
                    animationDelay: `${Math.random() * 0.6}s`,
                    transform: `translateX(-50%) scale(${
                      0.6 + Math.random() * 0.8
                    })`,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-3 relative">
              <span className="lu-title font-semibold tracking-[0.4em] text-amber-200/90">
                LEVEL
              </span>
              <span className="lu-number drop-shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
                {level}
              </span>
              <span className="text-[11px] uppercase tracking-[0.35em] text-amber-100/70 mt-1 opacity-80">
                Achieved
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-r from-background/80 via-background/40 to-background/80 backdrop-blur px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={36}
            height={36}
            className="rounded"
            priority
          />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              ClassPulse: Live Class
            </h1>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 flex gap-2">
              <span
                className={`${
                  status === "Connected"
                    ? "text-emerald-400"
                    : status === "Reconnecting..."
                    ? "text-yellow-400"
                    : status === "Failed"
                    ? "text-red-400"
                    : "text-muted-foreground/80"
                }`}
              >
                {status}
              </span>
              {ctx && (
                <span>
                  Code:{" "}
                  <span className="font-medium tracking-wide">
                    {ctx.classCode}
                  </span>
                </span>
              )}
              {slide && <span>Slide {slide.index}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              document.dispatchEvent(new CustomEvent("__toggleLogs"))
            }
            className="group relative h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/40 bg-background/40 hover:bg-background/70 text-xs font-medium text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Toggle Logs"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-80 group-hover:opacity-100"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded bg-background/90 border border-border/50 shadow opacity-0 group-hover:opacity-100 transition-opacity">
              Logs
            </span>
          </button>
          <Button size="sm" variant="destructive" onClick={handleLeave}>
            Leave
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 flex-1 auto-rows-min lg:grid-cols-[1fr_380px]">
        {/* Left Column */}
        <div className="flex flex-col gap-4 min-h-0 flex-1">
          <SlideViewer
            slide={slide}
            isInSlideshow={isInSlideshow}
            loading={slideImageLoading}
          />
          <RealtimeFeed messages={messages} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <ActivityPanel
            activity={activity}
            onSubmit={submitActivityChoices}
            onReveal={toggleActivityReveal}
            onSend={submitActivityResponse}
          />
          <StarsRankDisplay
            stars={stars}
            level={level}
            nextThreshold={nextThreshold}
            levelProgress={levelProgress}
            justLeveled={confettiBursts.length > 0 && level > 0}
            condensed
          />
          <PresenterCard
            profile={profile}
            presenterEmail={ctx?.presenterEmail}
            truncate={truncate}
          />
          <ParticipantCard ctx={ctx} truncate={truncate} />
          <SessionStats
            joinedAt={joinedAt}
            eventsCount={eventsCount}
            formattedDuration={formattedDuration}
            lastEventTs={
              messages.length ? messages[messages.length - 1].ts : joinedAt
            }
          />
          <ContextCard ctx={ctx} />
        </div>
      </div>

      <LogPanel />

      {/* Duplicate Connection Modal (Big Popup) */}
      {duplicateConnection && !removedFromClass && (
        <div
          className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
            modalVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative w-full max-w-xl mx-auto bg-gradient-to-br from-background/90 via-background/70 to-background/90 border border-border/70 rounded-3xl shadow-2xl p-10 flex flex-col gap-8">
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-300/30">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="flex-1 flex flex-col gap-3 pr-2">
                <h2 className="text-3xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300">
                  You have joined class on another tab.
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground/90">
                  Switch the active class session to{" "}
                  <span className="font-medium text-foreground">this</span> tab?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 pt-2">
              <Button
                size="lg"
                type="button"
                variant="outline"
                onClick={handleLeave}
              >
                Leave class
              </Button>
              <Button
                size="lg"
                type="button"
                onClick={() => forceReconnect()}
                className="relative"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Removal Toast */}
      {removedToastVisible && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl border border-red-400/40 bg-red-500/15 backdrop-blur-md shadow-lg flex items-start gap-3 animate-[fadeIn_.4s_ease]"
          role="alert"
          aria-live="assertive"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/30 text-red-200 text-sm font-bold">
            !
          </span>
          <div className="text-sm text-red-100/90 font-medium tracking-wide">
            You were removed from the class. Redirecting...
          </div>
        </div>
      )}
    </div>
  );
}
