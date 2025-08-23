import React from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { SlideState } from "@/types";

interface Props {
  slide: SlideState | null;
  isInSlideshow: boolean;
  loading: boolean;
}

export function SlideViewer({ slide, isInSlideshow, loading }: Props) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-muted/20 via-background to-muted/10 flex-1 min-h-[360px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            {slide?.title || "Slide Viewer"}
          </span>
          {slide && (
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 tabular-nums px-2 py-0.5 rounded-full bg-muted/30 border border-border/40">
              <span className="opacity-70 tracking-wide mr-0.5">Slide</span>
              <span className="text-foreground">{slide.index}</span>
              {slide.totalSlideCount && (
                <span className="opacity-60">/ {slide.totalSlideCount}</span>
              )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        <div className="relative h-[420px] lg:h-[520px] rounded-xl border border-border/50 bg-background/60 backdrop-blur flex items-center justify-center shadow-inner overflow-hidden">
          {(!isInSlideshow || !slide?.imageUrl) && (
            <>
              <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary))_0,transparent_60%),radial-gradient(circle_at_70%_70%,hsl(var(--secondary))_0,transparent_60%)]" />
              <div className="relative z-10 text-center space-y-4 px-8">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {isInSlideshow ? "Loading Slide" : "Not In Slideshow"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isInSlideshow
                    ? "A slide preview will appear momentarily."
                    : "Presenter is not currently in slideshow mode."}
                </p>
                <div className="flex justify-center gap-2 text-[10px] uppercase tracking-wider">
                  <span className="px-2 py-1 rounded bg-muted/30 border border-border/40">
                    Live
                  </span>
                  <span className="px-2 py-1 rounded bg-muted/30 border border-border/40">
                    Interactive
                  </span>
                  <span className="px-2 py-1 rounded bg-muted/30 border border-border/40">
                    Beta UI
                  </span>
                </div>
              </div>
            </>
          )}
          {isInSlideshow && slide?.imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 border-2 border-border/40 border-t-foreground/70 rounded-full animate-spin" />
                </div>
              )}
              <Image
                src={slide.imageUrl}
                alt={slide.title || `Slide ${slide.index}`}
                fill
                unoptimized
                className="object-contain select-none"
                sizes="(max-width: 1024px) 100vw, 80vw"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
