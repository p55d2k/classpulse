"use client";
import * as React from "react";
import { logger, formatTimestamp } from "@/lib/logger";
import type { LogEntry } from "@/types";
import { Button } from "@/components/ui/button";

export function LogPanel() {
  const [open, setOpen] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  React.useEffect(() => logger.subscribe(setLogs), []);

  // Listen for global toggle events dispatched from compact top bar icon
  React.useEffect(() => {
    const handler = () => setOpen((o) => !o);
    document.addEventListener("__toggleLogs", handler as EventListener);
    return () => document.removeEventListener("__toggleLogs", handler as EventListener);
  }, []);

  const levels: Record<string, string> = {
    debug: "text-muted-foreground",
    info: "text-foreground",
    warn: "text-yellow-400",
    error: "text-red-400",
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 text-[11px] font-mono pointer-events-none select-none">
      {open && (
        <div className="mb-2 w-[640px] max-h-[420px] flex flex-col rounded-lg border border-neutral-700/70 bg-neutral-950/90 backdrop-blur-xl shadow-2xl ring-1 ring-black/60 text-neutral-100 pointer-events-auto select-text">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-neutral-700/70 bg-gradient-to-r from-neutral-900/70 to-neutral-900/30 rounded-t">
            <span className="font-semibold tracking-wide text-sm">
              Logs <span className="opacity-60">({logs.length})</span>
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => logger.clear()}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
          <ul className="flex-1 overflow-auto p-2 space-y-1.5 pr-3">
            {logs
              .slice()
              .reverse()
              .map((l) => (
                <li
                  key={l.id}
                  className={`group rounded-md px-2 py-1.5 border border-neutral-700/40 hover:border-neutral-500/70 transition-colors bg-neutral-800/30 ${
                    levels[l.level]
                  }`}
                >
                  <div className="grid grid-cols-[80px_48px_1fr] items-start gap-2">
                    <span className="opacity-50 tabular-nums text-[10px] leading-5">
                      {formatTimestamp(l.ts)}
                    </span>
                    <span className="uppercase tracking-wide text-[10px] font-semibold opacity-70 leading-5">
                      {l.level}
                    </span>
                    <span className="font-medium leading-5 break-words">
                      {l.message}
                    </span>
                  </div>
                  {l.data !== undefined && l.data !== null && (
                    <pre className="mt-1 ml-[128px] whitespace-pre-wrap break-words text-[10px] leading-snug rounded bg-neutral-900/60 px-2 py-1 max-h-40 overflow-auto">
                      {JSON.stringify(l.data, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            {logs.length === 0 && (
              <li className="text-neutral-400 italic px-2 py-2">No logs yet...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
