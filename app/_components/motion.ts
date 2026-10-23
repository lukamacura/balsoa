import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/** Frame-rate independent exponential smoothing towards a moving target. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export type Spring = { value: number; velocity: number };

export const spring = (value: number): Spring => ({ value, velocity: 0 });

/**
 * Advances a spring towards `target`. `response` is the undamped period in seconds and
 * `damping` the damping ratio (1 = critically damped), so motion always starts from the
 * live value and keeps its velocity when the target changes mid-flight.
 */
export function stepSpring(s: Spring, target: number, dt: number, response = 0.6, damping = 1) {
  const stiffness = ((2 * Math.PI) / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  const steps = Math.max(1, Math.ceil(dt * 240));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    s.velocity += (-stiffness * (s.value - target) - friction * s.velocity) * h;
    s.value += s.velocity * h;
  }
}

/** Progress (0–1) of scrolling through a tall track whose child is `position: sticky`. */
export function pinnedProgress(track: HTMLElement) {
  const rect = track.getBoundingClientRect();
  const span = rect.height - window.innerHeight;
  return span > 0 ? clamp(-rect.top / span) : 0;
}

/**
 * Runs `frame` on every animation frame while `el` is on screen. `margin` starts it early, so
 * the first frame is already drawn when the element scrolls in.
 */
export function animateWhileVisible(el: Element, frame: (dt: number, time: number) => void, margin = "0px") {
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    // Schedule first so one failing frame can't freeze the animation for good.
    raf = requestAnimationFrame(tick);
    frame(dt, now / 1000);
  };
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!entry.isIntersecting && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }, { rootMargin: margin });
  observer.observe(el);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(raf);
  };
}

export type CanvasSize = { width: number; height: number; dpr: number };

/** Keeps a canvas backing store matched to its CSS size and device pixel ratio. */
export function trackCanvasSize(canvas: HTMLCanvasElement, size: CanvasSize) {
  // Layout size, not getBoundingClientRect, which would shrink with a transformed ancestor.
  const update = (width: number, height: number) => {
    size.dpr = Math.min(window.devicePixelRatio || 1, 2);
    size.width = width;
    size.height = height;
    // Assigning a canvas dimension clears it, even to the same value.
    const w = Math.round(width * size.dpr);
    const h = Math.round(height * size.dpr);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  };
  update(canvas.clientWidth, canvas.clientHeight);
  const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height));
  observer.observe(canvas);
  return () => observer.disconnect();
}

const dotSets = new Map<string, Promise<Int16Array>>();

/** Land dots generated offline as a flat [lon×10, lat×10, …] list. */
export function loadDots(url: string) {
  let set = dotSets.get(url);
  if (!set) {
    set = fetch(url)
      .then((res) => res.json() as Promise<number[]>)
      .then((values) => Int16Array.from(values));
    set.catch(() => dotSets.delete(url));
    dotSets.set(url, set);
  }
  return set;
}

export function monoFont(size: number, weight = 500) {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono");
  return `${weight} ${size}px ${family || "ui-monospace, monospace"}`;
}
