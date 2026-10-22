"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animateWhileVisible, clamp, damp, pinnedProgress, useReducedMotion } from "./motion";

/**
 * Fills the services pipe as the visitor scrolls (pinned on desktop, passing through on
 * mobile) and switches each station on the moment the flow reaches its node.
 */
export function PipelineProgress({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    const pipe = root?.querySelector<HTMLElement>("[data-pipe]");
    if (!root || !pipe || reduced) return;

    const nodes = [...root.querySelectorAll<HTMLElement>("[data-station-node]")];
    const gauge = root.querySelector<HTMLElement>("[data-gauge]");
    const pinned = window.matchMedia("(min-width: 64rem)");
    root.dataset.live = "";

    let fill = 0;
    let shown = "";
    const frame = (dt: number) => {
      const box = pipe.getBoundingClientRect();
      const target = pinned.matches
        ? clamp(pinnedProgress(root) * 1.08)
        : clamp((window.innerHeight * 0.62 - box.top) / box.height);
      fill = damp(fill, target, 7, dt);
      root.style.setProperty("--fill", fill.toFixed(4));

      const horizontal = box.width > box.height;
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        const at = horizontal
          ? (rect.left + rect.width / 2 - box.left) / box.width
          : (rect.top + rect.height / 2 - box.top) / box.height;
        node.closest("[data-station]")?.toggleAttribute("data-on", fill >= at);
      }

      const pct = String(Math.round(fill * 100)).padStart(3, "0");
      if (gauge && pct !== shown) gauge.textContent = shown = pct;
    };

    const stop = animateWhileVisible(root, frame);
    return () => {
      stop();
      delete root.dataset.live;
      root.style.removeProperty("--fill");
    };
  }, [reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
