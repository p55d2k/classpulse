// Simple client/server safe logging utility with in-memory ring buffer and subscription.
// Use in place of console.* for app-level events. Logs kept only in-memory (optionally mirrored to window for debugging).

import { LogEntry, LogLevel } from "@/types";

const MAX_LOGS = 500;
let buffer: LogEntry[] = [];

// Subscribers (client side only)
const subs = new Set<(entries: LogEntry[]) => void>();

// (Global window augmentation now declared centrally in types)

function emit() {
  for (const fn of subs) {
    try {
      fn(buffer.slice());
    } catch {
      /* noop */
    }
  }
  if (typeof window !== "undefined") {
    window.__APP_LOGS__ = buffer;
  }
}

function push(level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    level,
    message,
    data,
  };
  buffer.push(entry);
  if (buffer.length > MAX_LOGS) buffer = buffer.slice(-MAX_LOGS);
  if (process.env.NODE_ENV !== "production") {
    // Mirror to console in dev for convenience.
    // Intentionally using console in dev environment
    // (rule suppressed via configuration rather than inline disable)
    console[level === "debug" ? "log" : level](
      "[log]",
      level.toUpperCase(),
      message,
      data ?? ""
    );
  }
  emit();
  return entry;
}

export const logger = {
  debug: (m: string, d?: unknown) => push("debug", m, d),
  info: (m: string, d?: unknown) => push("info", m, d),
  warn: (m: string, d?: unknown) => push("warn", m, d),
  error: (m: string, d?: unknown) => push("error", m, d),
  get: () => buffer.slice(),
  subscribe(fn: (entries: LogEntry[]) => void) {
    subs.add(fn);
    // Provide a copy on initial subscribe as well.
    fn(buffer.slice());
    return () => {
      subs.delete(fn);
    };
  },
  clear() {
    buffer = [];
    emit();
  },
};

export function formatTimestamp(ts: number) {
  const d = new Date(ts);
  return (
    d.toLocaleTimeString(undefined, { hour12: false }) +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}
