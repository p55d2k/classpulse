"use client";
import React from "react";
import { Button } from "@/components/ui/button";

export interface ActivityPanelProps {
  activity: {
    id: string;
    type: string;
    choices: string[];
    allowMultiple: boolean;
    correctAnswers: string[];
    submitted: string[];
    slideUrl?: string;
    status?: string;
    reveal: boolean;
  } | null;
  onSubmit: (choices: string[]) => void;
  onReveal: () => void;
  onSend?: (choices: string[]) => void;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({
  activity,
  onSubmit,
  onReveal,
  onSend,
}) => {
  if (!activity) return null;

  const {
    type,
    choices,
    allowMultiple,
    correctAnswers,
    submitted,
    reveal,
    status,
  } = activity;

  const toggleChoice = (c: string) => {
    if (allowMultiple) {
      const next = submitted.includes(c)
        ? submitted.filter((x) => x !== c)
        : [...submitted, c];
      onSubmit(next);
    } else {
      const next = submitted[0] === c ? [] : [c];
      onSubmit(next);
    }
  };

  const isCorrect = (c: string) =>
    reveal && correctAnswers.length > 0 && correctAnswers.includes(c);
  const isIncorrectSubmitted = (c: string) =>
    reveal && submitted.includes(c) && !correctAnswers.includes(c);

  const isSubmitted = status === "submitted";
  const isClosed = status === "closed";
  const locked = isSubmitted || isClosed;

  return (
    <div className="rounded-xl border border-border/60 bg-background/60 backdrop-blur p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          {type || "Activity"}
        </h3>
        {correctAnswers.length > 0 && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {correctAnswers.length} answer
            {correctAnswers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="grid gap-2">
        {choices.map((c) => {
          const active = submitted.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleChoice(c)}
              className={`group relative w-full px-4 py-3 rounded-lg border text-left transition cursor-pointer
                ${
                  active
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                    : "border-border/50 bg-background/40 hover:bg-background/70 text-foreground/90"
                }
                ${isCorrect(c) ? "ring-2 ring-emerald-400/70" : ""}
                ${isIncorrectSubmitted(c) ? "opacity-50 line-through" : ""}`}
              disabled={reveal || locked}
            >
              <span className="font-medium tracking-wide">{c}</span>
            </button>
          );
        })}
      </div>
      <div className="pt-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 flex gap-2">
            <span>{allowMultiple ? "Multi-select" : "Single select"}</span>
            {status && (
              <span className="text-muted-foreground/50">{status}</span>
            )}
          </div>
          {reveal && (
            <span className="text-[11px] font-medium tracking-wide text-emerald-300/80">
              Answers revealed
            </span>
          )}
          {isClosed && !reveal && (
            <span className="text-[11px] font-medium tracking-wide text-red-300/80">
              Closed
            </span>
          )}
          {isSubmitted && !reveal && (
            <span className="text-[11px] font-medium tracking-wide text-amber-300/80">
              Submitted
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border/60"
            disabled={submitted.length === 0 || locked}
            onClick={() => {
              onSubmit(submitted);
              onSend?.(submitted);
            }}
          >
            Submit
          </Button>
          {correctAnswers.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-border/60"
              disabled={locked}
              onClick={onReveal}
            >
              {reveal ? "Unreveal" : "Reveal"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border/60"
            disabled={submitted.length === 0 || locked}
            onClick={() => onSubmit([])}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
