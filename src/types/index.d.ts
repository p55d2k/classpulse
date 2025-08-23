// Centralized shared application types

// Realtime slide state
export interface SlideState {
  index: number;
  title?: string;
  imageUrl?: string;
  totalSlideCount?: number;
}

// Generic session message envelope used for realtime feed
export interface SessionMessage {
  t: string; // event type label
  payload: unknown; // raw event payload (kept as unknown for safe narrowing)
  ts: number; // timestamp (ms)
}

// Presenter profile (normalized from upstream DTO)
export interface PresenterProfile {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  organization?: string;
  isCCT?: boolean;
  isCCE?: boolean;
  isCSC?: boolean;
  isOnPro?: boolean;
  isOnPremium?: boolean;
}

// Core class session state (returned from useClassSession). Setter functions are appended at call site via intersection.
export interface ClassSessionState {
  status: string;
  connection: import("@microsoft/signalr").HubConnection | null;
  slide: SlideState | null;
  isInSlideshow: boolean;
  stars: number;
  eventsCount: number;
  messages: SessionMessage[];
  level: number;
  nextThreshold: number | null;
  levelProgress: number; // 0..1
  justLeveled: boolean;
  joinedAt: number;
  profile: PresenterProfile | null;
  slideImageLoading: boolean;
  confettiBursts: number[];
  removedFromClass?: boolean;
}

// Join / validation related types
export interface ClassCodeResult {
  cpcsRegion: string;
  presenterEmail: string;
  classCode: string;
  [k: string]: unknown;
}

export interface ValidateJoinResult {
  classSessionId?: string;
  [k: string]: unknown;
}

export type ValidateJoinAttempt =
  | { ok: true; statusCode: number; message: string; data: ValidateJoinResult }
  | {
      ok: false;
      statusCode: number;
      message: string;
      errorCode?: string;
      data?: Record<string, unknown>;
    };

export interface JoinContext {
  cpcsRegion: string;
  presenterEmail: string;
  classCode: string;
  participantId: string;
  participantUsername: string;
  participantName: string;
  classSessionId?: string;
}

export interface ValidateJoinPayload {
  cpcsRegion: string;
  presenterEmail: string;
  classCode: string;
  participantId: string;
  participantUsername: string;
}

// Logging types
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  message: string;
  data?: unknown;
}

// Global window augmentation (ambient) for accessing logs in dev tools
declare global {
  interface Window {
    __APP_LOGS__?: LogEntry[];
  }
}

export {}; // ensure this file is treated as a module
