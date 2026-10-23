"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animateWhileVisible, clamp, damp, lerp, useReducedMotion } from "./motion";

const WRITE_SPEED = 2600; // SVG units per second of pen-on-paper
const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

type Phase = "idle" | "writing" | "done";

/**
 * A clipboard whose sheet is written out by a pen the first time it scrolls into view.
 * Children are the sheet's SVG content; every `path[data-ink]` is drawn in DOM order.
 */
export function CalcSheet({
  width,
  height,
  restX,
  restY,
  children,
}: {
  width: number;
  height: number;
  restX: number;
  restY: number;
  children: ReactNode;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<SVGSVGElement>(null);
  const penRef = useRef<SVGGElement>(null);
  const penBodyRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGGElement>(null);
  const controls = useRef<{ start: () => void; skip: () => void } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const reduced = useReducedMotion();

  useEffect(() => {
    const board = boardRef.current;
    const sheet = sheetRef.current;
    const pen = penRef.current;
    const penBody = penBodyRef.current;
    const shadow = shadowRef.current;
    if (!board || !sheet || !pen || !penBody || !shadow || reduced) return;

    // ---- Timeline: pen travels to each stroke, draws it at a steady speed, lifts, moves on.
    const rest = { x: restX, y: restY };
    let clock = 0.35;
    let from = rest;
    const steps = [...sheet.querySelectorAll<SVGPathElement>("[data-ink]")].map((path) => {
      const length = path.getTotalLength();
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(length);
      const travel = clamp(Math.hypot(start.x - from.x, start.y - from.y) / 3200, 0.008, 0.3);
      const pause = path.dataset.pause !== undefined ? 0.05 : 0;
      const step = {
        path,
        length,
        from,
        start: { x: start.x, y: start.y },
        leave: clock,
        begin: clock + travel + pause,
        finish: clock + travel + pause + (length / WRITE_SPEED) * (path.dataset.marker !== undefined ? 1.5 : 1),
      };
      clock = step.finish;
      from = { x: end.x, y: end.y };
      return step;
    });
    const lastFinish = clock;
    let returnFrom = from;

    const hideInk = () => {
      for (const s of steps) {
        s.path.style.strokeDasharray = `${s.length} ${s.length + 4}`;
        s.path.style.strokeDashoffset = String(s.length);
        s.path.style.visibility = "hidden";
      }
    };
    const showInk = () => {
      for (const s of steps) {
        s.path.style.strokeDashoffset = "0";
        s.path.style.visibility = "visible";
      }
    };
    hideInk();

    let running = false;
    let written = false;
    let elapsed = 0;
    let cursor = 0;
    let lift = 1;
    let wobble = 0;
    let prevX = rest.x;
    const tip = { ...rest };
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

    const start = () => {
      hideInk();
      elapsed = 0;
      cursor = 0;
      running = true;
      written = false;
      returnFrom = from;
      setPhase("writing");
    };
    const skip = () => {
      showInk();
      cursor = steps.length;
      elapsed = Math.max(elapsed, lastFinish);
      returnFrom = { ...tip };
      written = true;
    };
    controls.current = { start, skip };

    const placePen = () => {
      pen.setAttribute("transform", `translate(${(tip.x + lift * 3).toFixed(2)} ${(tip.y - lift * 9).toFixed(2)})`);
      penBody.setAttribute("transform", `rotate(${(30 + wobble).toFixed(2)})`);
      shadow.setAttribute("transform", `translate(${(tip.x + 10 + lift * 16).toFixed(2)} ${(tip.y + 8 + lift * 14).toFixed(2)}) rotate(30)`);
      shadow.style.opacity = String(0.34 - lift * 0.14);
    };

    const frame = (dt: number) => {
      // Gentle 3D tilt towards the pointer
      tilt.x = damp(tilt.x, tilt.tx, 5, dt);
      tilt.y = damp(tilt.y, tilt.ty, 5, dt);
      board.style.transform = `perspective(1600px) rotateX(${(-tilt.y * 4).toFixed(3)}deg) rotateY(${(tilt.x * 5).toFixed(3)}deg) rotate(-1.6deg)`;

      let drawing = false;
      if (running) {
        elapsed += dt;
        while (cursor < steps.length && elapsed >= steps[cursor].finish) {
          const done = steps[cursor];
          done.path.style.visibility = "visible";
          done.path.style.strokeDashoffset = "0";
          cursor++;
        }

        if (cursor < steps.length) {
          const s = steps[cursor];
          if (elapsed >= s.begin) {
            const p = (elapsed - s.begin) / (s.finish - s.begin);
            s.path.style.visibility = "visible";
            s.path.style.strokeDashoffset = String(s.length * (1 - p));
            const point = s.path.getPointAtLength(s.length * p);
            tip.x = point.x;
            tip.y = point.y;
            drawing = true;
          } else {
            const u = easeInOut(clamp((elapsed - s.leave) / Math.max(s.begin - s.leave, 0.001)));
            tip.x = lerp(s.from.x, s.start.x, u);
            tip.y = lerp(s.from.y, s.start.y, u);
          }
        } else {
          const u = easeInOut(clamp((elapsed - lastFinish) / 0.9));
          tip.x = lerp(returnFrom.x, rest.x, u);
          tip.y = lerp(returnFrom.y, rest.y, u);
          if (u >= 1) {
            running = false;
            written = true;
            setPhase("done");
          }
        }
      }

      // The pen lifts between strokes and the wrist rocks slightly with horizontal motion.
      lift = damp(lift, drawing ? 0 : 1, 22, dt);
      wobble = damp(wobble, clamp((tip.x - prevX) / Math.max(dt, 1 / 240) / 900, -2.5, 2.5), 8, dt);
      prevX = tip.x;
      placePen();
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const box = board.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width - 0.5;
      const y = (e.clientY - box.top) / box.height - 0.5;
      const near = Math.abs(x) < 0.9 && Math.abs(y) < 0.9;
      tilt.tx = near ? clamp(x * 2, -1, 1) : 0;
      tilt.ty = near ? clamp(y * 2, -1, 1) : 0;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Start writing once most of the sheet is on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running && !written) start();
      },
      { threshold: 0.45 },
    );
    observer.observe(board);
    placePen();
    const stop = animateWhileVisible(board, frame);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      controls.current = null;
      for (const s of steps) s.path.removeAttribute("style");
      board.style.transform = "";
    };
  }, [reduced, restX, restY]);

  return (
    <div className="mx-auto w-full max-w-[30rem]">
      <div ref={boardRef} className="clipboard relative" style={{ aspectRatio: `${width} / ${height}` }}>
        <div className="clipboard-board absolute inset-0" />
        <div className="clipboard-paper clipboard-paper--under-2 absolute" />
        <div className="clipboard-paper clipboard-paper--under-1 absolute" />
        <div className="clipboard-paper absolute" />
        <svg
          ref={sheetRef}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          {children}
        </svg>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="pen-body" x1="-11" x2="11" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#8a3a0e" />
              <stop offset="0.3" stopColor="#e0701f" />
              <stop offset="0.48" stopColor="#ffd29a" />
              <stop offset="0.62" stopColor="#f5a142" />
              <stop offset="1" stopColor="#9a4512" />
            </linearGradient>
            <linearGradient id="pen-metal" x1="-10" x2="10" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6c747d" />
              <stop offset="0.45" stopColor="#f4f6f8" />
              <stop offset="1" stopColor="#5d646c" />
            </linearGradient>
            <linearGradient id="pen-grip" x1="-10" x2="10" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#06080b" />
              <stop offset="0.45" stopColor="#3a434d" />
              <stop offset="1" stopColor="#06080b" />
            </linearGradient>
            <filter id="pen-shadow-blur" x="-50%" y="-20%" width="200%" height="140%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <g ref={shadowRef} transform={`translate(${restX + 26} ${restY + 22}) rotate(30)`} opacity="0.2">
            <rect x="-9" y="-300" width="18" height="300" rx="9" fill="#1a0f05" filter="url(#pen-shadow-blur)" />
          </g>

          <g ref={penRef} transform={`translate(${restX + 3} ${restY - 9})`}>
            <g ref={penBodyRef} transform="rotate(30)">
              <path d="M0 0 L-2.6 -9 L2.6 -9 Z" fill="#1f2328" />
              <path d="M-2.6 -9 L-8.5 -40 L8.5 -40 L2.6 -9 Z" fill="url(#pen-metal)" />
              <rect x="-9" y="-96" width="18" height="58" rx="2.5" fill="url(#pen-grip)" />
              {Array.from({ length: 9 }, (_, i) => (
                <rect key={i} x="-9" y={-90 + i * 5.6} width="18" height="1.4" fill="#000" opacity="0.35" />
              ))}
              <rect x="-10" y="-300" width="20" height="208" rx="4" fill="url(#pen-body)" />
              <rect x="-10" y="-104" width="20" height="10" fill="url(#pen-metal)" />
              <rect x="-10.5" y="-318" width="21" height="22" rx="7" fill="url(#pen-grip)" />
              <rect x="7" y="-300" width="5" height="96" rx="2.5" fill="url(#pen-metal)" />
            </g>
          </g>
        </svg>
      </div>

      {!reduced && (
        <div className="mt-8 flex justify-center lg:justify-end">
          <button
            type="button"
            onClick={() => (phase === "writing" ? controls.current?.skip() : controls.current?.start())}
            className="press label-mono group inline-flex h-10 items-center gap-3 rounded-full border border-white/15 pl-3 pr-4 text-white/70 hover:border-white/40 hover:text-white"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
              <svg viewBox="0 0 10 10" className="h-2 w-2" aria-hidden="true">
                {phase === "writing" ? (
                  <path d="M1 1l4 4-4 4zM5 1l4 4-4 4z" fill="currentColor" />
                ) : (
                  <path d="M8.5 5A3.5 3.5 0 1 1 7.5 2.5M7.5 0.5v2.2H5.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
                )}
              </svg>
            </span>
            {phase === "writing" ? "Skip writing" : phase === "done" ? "Write it again" : "Write it out"}
          </button>
        </div>
      )}
    </div>
  );
}
