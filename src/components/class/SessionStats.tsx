import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  joinedAt: number;
  eventsCount: number;
  formattedDuration: string;
  lastEventTs: number;
}

export function SessionStats({
  joinedAt,
  eventsCount,
  formattedDuration,
  lastEventTs,
}: Props) {
  const [now, setNow] = React.useState(Date.now());

  // lightweight 1s ticker to refresh relative times; auto stops on unmount
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const uptimeMs = now - joinedAt;
  const eventsPerMinute = uptimeMs > 0 ? eventsCount / (uptimeMs / 60000) : 0;
  const lastEventAgeMs = Math.max(0, now - lastEventTs);
  const lastEventAge = (() => {
    const s = Math.floor(lastEventAgeMs / 1000);
    if (s < 1) return "just now";
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m " + (s % 60) + "s ago";
    const h = Math.floor(m / 60);
    return h + "h " + (m % 60) + "m ago";
  })();

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
            <span className="opacity-60">Events/min</span>
            <span>{eventsPerMinute.toFixed(2)}</span>
          </li>
          <li className="flex justify-between">
            <span className="opacity-60">Last event</span>
            <span>{eventsCount > 0 ? lastEventAge : "—"}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
