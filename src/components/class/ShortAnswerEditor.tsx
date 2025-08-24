"use client";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface ShortAnswerEditorProps {
  disabled: boolean;
  onSubmitHtml: (html: string) => void;
  remaining: number;
}

const toolbarBtn =
  "h-7 px-2 text-[11px] rounded-md border border-border/40 bg-background/40 hover:bg-background/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

// Lightweight inline rich-text editor for short answers
export const ShortAnswerEditor: React.FC<ShortAnswerEditorProps> = ({
  disabled,
  onSubmitHtml,
  remaining,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = "<p></p>"; // minimal initial paragraph to keep caret sensible
    }
  }, []);

  // Basic in-browser sanitization (remove script tags & inline event handlers)
  const sanitize = (html: string) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    // Remove script/style tags
    wrapper.querySelectorAll("script, style").forEach((el) => el.remove());
    // Strip on* attributes
    const treeWalker = document.createTreeWalker(
      wrapper,
      NodeFilter.SHOW_ELEMENT
    );
    while (treeWalker.nextNode()) {
      const el = treeWalker.currentNode as HTMLElement;
      [...el.attributes].forEach((attr) => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        if (attr.name === "srcdoc") el.removeAttribute(attr.name);
      });
    }
    return wrapper.innerHTML;
  };

  const exec = (cmd: string, val?: string) => {
    if (disabled) return;
    document.execCommand(cmd, false, val);
    if (ref.current) setCharCount(ref.current.innerText.trim().length);
  };

  const handleSubmit = () => {
    if (!ref.current) return;
    const raw = sanitize(ref.current.innerHTML);
    if (!raw || !ref.current.innerText.trim()) return;
    onSubmitHtml(raw);
    ref.current.innerHTML = "<p></p>";
    setCharCount(0);
    ref.current.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1 relative">
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => exec("bold")}
        >
          Bold
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => exec("italic")}
        >
          Italic
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => exec("underline")}
        >
          Underline
        </button>
      </div>
      <div
        ref={ref}
        className="min-h-28 max-h-40 overflow-auto rounded-lg border border-border/50 bg-background/40 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 prose prose-invert prose-p:my-1"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() => {
          if (ref.current) setCharCount(ref.current.innerText.trim().length);
        }}
      />
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/60">
        <span>Remaining submissions: {remaining}</span>
        <span>{charCount} chars</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-border/60"
          disabled={disabled || remaining <= 0}
          onClick={handleSubmit}
        >
          {remaining <= 1 ? "Submit" : "Send"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-border/60"
          disabled={disabled}
          onClick={() => {
            if (ref.current) {
              ref.current.innerHTML = "<p></p>";
              setCharCount(0);
            }
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};
