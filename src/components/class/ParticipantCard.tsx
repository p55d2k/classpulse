import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JoinContext } from "@/types";

interface Props {
  ctx: Partial<JoinContext> | null;
  truncate: (v: string | undefined | null, l?: number) => string;
}

export function ParticipantCard({ ctx, truncate }: Props) {
  return (
    <Card className="border-border/60 bg-background/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 tracking-wide">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          You
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm flex items-center gap-3">
        <div className="relative h-12 w-12 aspect-square overflow-hidden rounded-full ring-1 ring-border/50 bg-gradient-to-br from-emerald-600 to-lime-600 text-white flex items-center justify-center font-semibold shadow-inner">
          {(
            ctx?.participantName?.[0] ||
            ctx?.participantUsername?.[0] ||
            "?"
          ).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-medium leading-tight">
            {(() => {
              const base =
                ctx?.participantName || ctx?.participantUsername || "";
              const t = truncate(base);
              return base.length > 30 ? <span title={base}>{t}</span> : t;
            })()}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {(() => {
              const id = ctx?.participantId || "";
              const t = truncate(id);
              return id.length > 30 ? <span title={id}>{t}</span> : t;
            })()}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="px-2 py-0.5 rounded bg-muted/30 text-[10px] uppercase tracking-wider border border-border/40">
              Participant
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
