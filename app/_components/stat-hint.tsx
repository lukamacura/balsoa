"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { QuestionIcon } from "./ui";

const GUTTER = 16;

/** "?" beside a hero figure that explains the jargon. Hover to peek, tap or press to pin. */
export function StatHint({ term, text }: { term: string; text: string }) {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setHovered(false);
      setPinned(false);
    };
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Centred over the icon, then nudged sideways so it never leaves the screen.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!open || !bubble) return;
    bubble.style.setProperty("--shift", "0px");
    const box = bubble.getBoundingClientRect();
    const shift = Math.max(GUTTER - box.left, Math.min(0, window.innerWidth - GUTTER - box.right));
    bubble.style.setProperty("--shift", `${shift.toFixed(1)}px`);
  }, [open]);

  return (
    <span
      ref={rootRef}
      data-open={open || undefined}
      className="stat-hint relative inline-flex"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
    >
      <button
        type="button"
        aria-label={`What does ${term} mean?`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setPinned((value) => !value)}
        className="stat-hint-trigger -m-1 flex size-6 items-center justify-center rounded-full text-white/40 outline-none transition-colors duration-300 hover:text-flare focus-visible:text-flare focus-visible:ring-1 focus-visible:ring-flare/60"
      >
        <QuestionIcon className="size-3.5" />
      </button>
      <span ref={bubbleRef} id={id} className="stat-hint-bubble">
        <span className="stat-hint-card">
          <span className="label-mono block text-flare">{term}</span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-white/75">{text}</span>
        </span>
      </span>
    </span>
  );
}
