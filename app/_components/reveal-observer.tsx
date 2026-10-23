"use client";

import { useEffect } from "react";

/**
 * Fades in every [data-reveal] element the first time it enters the viewport.
 * [data-reveal-group] gets the same `is-in` class without fading itself, for parents
 * whose children choreograph their own entrance.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    // Anything already on screen (or scrolled past) at hydration stays put instead of
    // blinking out and fading back in.
    document.querySelectorAll("[data-reveal], [data-reveal-group]").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
      else observer.observe(el);
    });
    root.dataset.revealReady = "";

    return () => {
      observer.disconnect();
      delete root.dataset.revealReady;
    };
  }, []);

  return null;
}
