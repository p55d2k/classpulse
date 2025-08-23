import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PresenterProfile } from "@/types";

interface Props {
  profile: PresenterProfile | null;
  presenterEmail?: string;
  truncate: (v: string | undefined | null, l?: number) => string;
}

export function PresenterCard({ profile, presenterEmail, truncate }: Props) {
  return (
    <Card className="border-border/60 bg-background/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 tracking-wide">
          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          Presenter
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm flex items-center gap-3">
        <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white flex items-center justify-center font-semibold shadow-inner">
          {(
            profile?.firstName?.[0] ||
            presenterEmail?.[0] ||
            "?"
          ).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-medium leading-tight">
            {(() => {
              const base = profile
                ? `${profile.firstName} ${profile.lastName}`.trim()
                : presenterEmail?.split("@")[0];
              const t = truncate(base);
              return base && base.length > 30 ? (
                <span title={base}>{t}</span>
              ) : (
                t
              );
            })()}
          </div>
          <div className="text-xs text-muted-foreground">
            {(() => {
              const email = presenterEmail || "";
              const t = truncate(email);
              return email.length > 30 ? <span title={email}>{t}</span> : t;
            })()}
          </div>
          {profile?.organization && (
            <div className="text-[10px] mt-1 text-muted-foreground/70 uppercase tracking-wider">
              {(() => {
                const org = profile?.organization || "";
                const t = truncate(org);
                return org.length > 30 ? <span title={org}>{t}</span> : t;
              })()}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {profile?.isOnPro && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase tracking-wider border border-amber-500/40">
                Pro
              </span>
            )}
            {profile?.isOnPremium && (
              <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[10px] uppercase tracking-wider border border-fuchsia-500/40">
                Premium
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
