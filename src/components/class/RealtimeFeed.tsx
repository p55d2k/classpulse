import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SessionMessage } from "@/types";

interface FeedProps {
  messages: SessionMessage[];
}

export function RealtimeFeed({ messages }: FeedProps) {
  return (
    <Card className="border-border/60 bg-background/70 backdrop-blur flex-1 hidden lg:flex flex-col min-h-[300px]">
      <CardHeader className="px-4 py-3 pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-purple-500" />
          Realtime Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-4 pb-4 pt-0 min-h-0">
        {/* Scroll region fills card when card stretches; otherwise natural height */}
        <div className="flex-1 overflow-auto text-xs pr-1 space-y-3 font-mono min-h-[220px]">
          {messages.length === 0 && (
            <div className="text-muted-foreground/70 italic">
              Waiting for events...
            </div>
          )}
          {messages
            .slice()
            .reverse()
            .map((m, i) => (
              <div
                key={i}
                className="group border border-border/30 hover:border-border/60 rounded-lg px-3 py-2 bg-muted/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold tracking-wide uppercase text-[10px] text-foreground/80">
                    {m.t}
                  </span>
                  <span className="text-[9px] opacity-60 tabular-nums">
                    {m.ts ? new Date(m.ts).toLocaleTimeString() : ""}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-words text-[10px] leading-snug text-foreground/70 max-h-32 overflow-auto">
                  {JSON.stringify(m.payload, null, 2)}
                </pre>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
