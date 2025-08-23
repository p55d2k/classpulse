import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JoinContext } from "@/types";

export function ContextCard({ ctx }: { ctx: Partial<JoinContext> | null }) {
  return (
    <Card className="border-border/60 bg-background/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 tracking-wide">
          <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          Context
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-[10px] leading-snug whitespace-pre-wrap break-words max-h-56 overflow-auto font-mono opacity-80">
          {JSON.stringify(ctx, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
