"use client";
import React from "react";

export interface ShortAnswerSubmissionsProps {
  submitted: string[];
  submittedDetails?: { responseId: string; data: string }[];
  numAllowed: number;
}

// Renders previously submitted short answer responses
export const ShortAnswerSubmissions: React.FC<ShortAnswerSubmissionsProps> = ({
  submitted,
  submittedDetails,
  numAllowed,
}) => {
  if (!submitted.length) return null;
  const showDetails =
    submittedDetails && submittedDetails.length === submitted.length;
  return (
    <div className="flex flex-col gap-3">
      {showDetails
        ? submittedDetails!.map((item) => (
            <div
              key={item.responseId}
              data-response-id={item.responseId}
              className="prose prose-invert prose-sm max-w-none border border-border/50 rounded-md bg-background/40 p-3 break-words"
              dangerouslySetInnerHTML={{ __html: item.data }}
            />
          ))
        : submitted.map((ans, i) => (
            <div
              key={i}
              className="prose prose-invert prose-sm max-w-none border border-border/50 rounded-md bg-background/40 p-3 break-words"
              dangerouslySetInnerHTML={{ __html: ans }}
            />
          ))}
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {submitted.length} / {numAllowed} submitted
      </div>
    </div>
  );
};
