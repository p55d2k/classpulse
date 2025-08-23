import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  joinedAt: number;
  eventsCount: number;
  formattedDuration: string;
}

export function SessionStats({
  joinedAt,
  eventsCount,
  formattedDuration,
}: Props) {
  return (
    <Card className="border-border/60 bg-background/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 tracking-wide">
          <span className="inline-flex h-2 w-2 rounded-full bg-pink-500" />
          Session Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-xs space-y-2 font-mono">
          <li className="flex justify-between">
            <span className="opacity-60">Joined</span>
            <span>{new Date(joinedAt).toLocaleTimeString()}</span>
          </li>
          <li className="flex justify-between">
            <span className="opacity-60">Uptime</span>
            <span>{formattedDuration}</span>
          </li>
          <li className="flex justify-between">
            <span className="opacity-60">Events</span>
            <span>{eventsCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="opacity-60">Stars</span>
            <span className="opacity-40">(see top)</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
