"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { countries, type LonLat, type ReachStage } from "@/lib/content";
import { HQ } from "@/lib/map";
import {
  animateWhileVisible,
  clamp,
  damp,
  easeOutCubic,
  lerp,
  loadDots,
  monoFont,
  pinnedProgress,
  smoothstep,
  spring,
  stepSpring,
  trackCanvasSize,
  useReducedMotion,
  type CanvasSize,
} from "./motion";
import { Flag, SectionLabel } from "./ui";

export type GlobeSite = { coords: LonLat; stage: number };

const RAD = Math.PI / 180;
const TAU = Math.PI * 2;
const ARC_SAMPLES = 56;
// Enough shading steps that dots never visibly pop between bands as the globe turns.
const DEPTH_BANDS = 12;
const HEAT_BANDS = 8;

type Vec3 = [number, number, number];

function toVec([lon, lat]: LonLat): Vec3 {
  const l = lon * RAD;
  const p = lat * RAD;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Great-circle samples from a to b, lifted off the surface so long hauls arc higher. */
function arcSamples(a: Vec3, b: Vec3) {
  const omega = Math.acos(clamp(dot3(a, b), -1, 1));
  const lift = 0.03 + 0.34 * (omega / Math.PI);
  const out = new Float32Array((ARC_SAMPLES + 1) * 3);
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const t = i / ARC_SAMPLES;
    const wa = omega < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / Math.sin(omega);
    const wb = omega < 1e-6 ? t : Math.sin(t * omega) / Math.sin(omega);
    const r = 1 + lift * Math.sin(Math.PI * t);
    out[i * 3] = (a[0] * wa + b[0] * wb) * r;
    out[i * 3 + 1] = (a[1] * wa + b[1] * wb) * r;
    out[i * 3 + 2] = (a[2] * wa + b[2] * wb) * r;
  }
  return out;
}

function graticule() {
  const lines: Float32Array[] = [];
  const line = (fn: (t: number) => LonLat) => {
    const out = new Float32Array(97 * 3);
    for (let i = 0; i <= 96; i++) out.set(toVec(fn(i / 96)), i * 3);
    lines.push(out);
  };
  for (let lat = -60; lat <= 60; lat += 30) line((t) => [-180 + t * 360, lat]);
  for (let lon = -180; lon < 180; lon += 30) line((t) => [lon, -85 + t * 170]);
  return lines;
}

export function ReachGlobe({
  title,
  stages,
  sites,
}: {
  title: string;
  stages: ReachStage[];
  sites: GlobeSite[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coordsRef = useRef<HTMLSpanElement>(null);
  const [stage, setStage] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!track || !canvas || !ctx) return;

    const size: CanvasSize = { width: 0, height: 0, dpr: 1 };
    const stopResize = trackCanvasSize(canvas, size);

    const hq = toVec(HQ.coords);
    const lines = graticule();
    const font = monoFont(10);

    // Sites reveal per stage, nearest to Vienna first, like a wave rolling outwards.
    const nodes = sites.map((site) => {
      const vec = toVec(site.coords);
      return { ...site, vec, arc: arcSamples(hq, vec), reach: dot3(hq, vec), order: 0, progress: 0, wait: 0, landedAt: -1 };
    });
    stages.forEach((_, i) => {
      nodes
        .filter((n) => n.stage === i)
        .sort((a, b) => b.reach - a.reach)
        .forEach((n, order) => (n.order = order));
    });

    let land: { x: Float32Array; y: Float32Array; z: Float32Array; warm: Float32Array[]; vienna: Float32Array } | null =
      null;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let pd = new Float32Array(0);
    let heat = new Float32Array(0);
    let cancelled = false;

    loadDots("/map/globe-dots.json").then((raw) => {
      if (cancelled) return;
      const count = raw.length / 2;
      const x = new Float32Array(count);
      const y = new Float32Array(count);
      const z = new Float32Array(count);
      const vienna = new Float32Array(count);
      const warm = stages.map(() => new Float32Array(count));
      const stageVecs = stages.map((_, i) => nodes.filter((n) => n.stage === i).map((n) => n.vec));
      for (let i = 0; i < count; i++) {
        const v = toVec([raw[i * 2] / 10, raw[i * 2 + 1] / 10]);
        x[i] = v[0];
        y[i] = v[1];
        z[i] = v[2];
        vienna[i] = smoothstep(Math.cos(16 * RAD), Math.cos(2 * RAD), dot3(v, hq));
        stageVecs.forEach((vecs, s) => {
          for (const site of vecs) {
            warm[s][i] = Math.max(warm[s][i], smoothstep(Math.cos(9 * RAD), Math.cos(1.5 * RAD), dot3(v, site)));
          }
        });
      }
      land = { x, y, z, warm, vienna };
      px = new Float32Array(count);
      py = new Float32Array(count);
      pd = new Float32Array(count);
      heat = new Float32Array(count);
    });

    const lon = spring(0);
    const lat = spring(0);
    const zoom = spring(1);
    const yaw = spring(0);
    const glow = stages.map(() => 0);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let primed = false;
    let current = -1;
    let coordsText = "";
    let travelText = "";

    // Globe geometry in CSS pixels, refreshed every frame from the canvas size.
    let cx = 0;
    let cy = 0;
    let radius = 1;

    // ---- Dragging: 1:1 while held, then the release velocity carries into a spring home.
    let dragging = false;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;

    const insideGlobe = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return Math.hypot(e.clientX - box.left - cx, e.clientY - box.top - cy) < radius * 1.05;
    };
    const onDown = (e: PointerEvent) => {
      if (!insideGlobe(e)) return;
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastT = e.timeStamp;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        if (e.pointerType === "mouse") canvas.style.cursor = insideGlobe(e) ? "grab" : "";
        return;
      }
      const degrees = (e.clientX - lastX) / radius / RAD;
      const elapsed = Math.max((e.timeStamp - lastT) / 1000, 1 / 240);
      yaw.value -= degrees;
      velocity = lerp(velocity, -degrees / elapsed, 0.6);
      lastX = e.clientX;
      lastT = e.timeStamp;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      yaw.value = ((((yaw.value + 180) % 360) + 360) % 360) - 180;
      yaw.velocity = clamp(velocity, -900, 900);
      canvas.style.cursor = "grab";
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    window.addEventListener("pointermove", onPointer, { passive: true });

    const frame = (dt: number, time: number) => {
      const { width, height, dpr } = size;
      if (!width || !height) return;

      // ---- Scroll → stage. Each stage holds for a while before the camera travels on.
      const enter = easeOutCubic(clamp(1 - track.getBoundingClientRect().top / window.innerHeight));
      const u = pinnedProgress(track) * (stages.length - 1);
      const base = Math.min(Math.floor(u), stages.length - 2);
      const travel = base + smoothstep(0.22, 0.78, u - base);
      const index = Math.round(travel);
      if (index !== current) {
        current = index;
        setStage(index);
      }
      const travelValue = (travel / (stages.length - 1)).toFixed(4);
      if (travelValue !== travelText) track.style.setProperty("--travel", (travelText = travelValue));

      const from = stages[base].view;
      const to = stages[base + 1].view;
      const t = travel - base;
      pointer.x = damp(pointer.x, pointer.tx, 2, dt);
      pointer.y = damp(pointer.y, pointer.ty, 2, dt);
      const targetLon = lerp(from[0], to[0], t) - (1 - enter) * 50 - pointer.x * 6;
      const targetLat = lerp(from[1], to[1], t) + pointer.y * 4;
      const targetZoom = (0.82 + 0.18 * enter) * lerp(stages[base].zoom, stages[base + 1].zoom, t);

      if (!primed || reduced) {
        lon.value = targetLon;
        lat.value = targetLat;
        zoom.value = targetZoom;
        primed = true;
      } else {
        stepSpring(lon, targetLon, dt, 1.4);
        stepSpring(lat, targetLat, dt, 1.4);
        stepSpring(zoom, targetZoom, dt, 1.2);
      }
      if (!dragging) stepSpring(yaw, 0, dt, 2.4);

      // ---- Reveal state
      for (const n of nodes) {
        if (n.stage <= index) {
          n.wait -= dt;
          if (n.wait <= 0) n.progress = reduced ? 1 : Math.min(1, n.progress + dt / 1.3);
          if (n.progress >= 1 && n.landedAt < 0) n.landedAt = time;
        } else {
          n.wait = 0.15 + n.order * 0.09;
          n.progress = reduced ? 0 : Math.max(0, n.progress - dt / 0.6);
          n.landedAt = -1;
        }
      }
      glow.forEach((g, i) => (glow[i] = damp(g, i === index ? 1 : 0, 2.2, dt)));

      // ---- Layout
      const wide = width >= 1024;
      cx = wide ? width * 0.66 : width * 0.5;
      cy = wide ? height * 0.52 : height * 0.48;
      radius = (wide ? Math.min(height * 0.42, width * 0.28) : Math.min(width * 0.47, height * 0.29)) * zoom.value;
      const R = radius;

      const camLon = (lon.value + yaw.value) * RAD;
      const camLat = clamp(lat.value, -60, 60) * RAD;
      const c0 = Math.cos(camLon);
      const s0 = Math.sin(camLon);
      const c1 = Math.cos(camLat);
      const s1 = Math.sin(camLat);
      // Orthographic projection into screen x/y plus depth (>0 faces the viewer).
      const out = { x: 0, y: 0, depth: 0, r2: 0 };
      const project = (x: number, y: number, z: number) => {
        const x1 = x * c0 + y * s0;
        const right = -x * s0 + y * c0;
        const up = -x1 * s1 + z * c1;
        out.depth = x1 * c1 + z * s1;
        out.x = cx + R * right;
        out.y = cy - R * up;
        out.r2 = right * right + up * up;
        return out;
      };
      const hidden = () => out.depth < 0 && out.r2 < 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Atmosphere and body
      let g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.38);
      g.addColorStop(0, "rgba(245,161,66,0.16)");
      g.addColorStop(0.35, "rgba(217,102,26,0.05)");
      g.addColorStop(1, "rgba(217,102,26,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);

      g = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx, cy, R * 1.05);
      g.addColorStop(0, "#151d26");
      g.addColorStop(0.6, "#0b1016");
      g.addColorStop(1, "#06080b");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();

      // Graticule, front hemisphere only
      ctx.beginPath();
      for (const line of lines) {
        let pen = false;
        for (let i = 0; i < line.length; i += 3) {
          project(line[i], line[i + 1], line[i + 2]);
          if (out.depth > 0) {
            if (pen) ctx.lineTo(out.x, out.y);
            else ctx.moveTo(out.x, out.y);
            pen = true;
          } else pen = false;
        }
      }
      ctx.strokeStyle = "rgba(138,150,163,0.09)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Land dots: faint far side shows through, near side shaded by depth, warm around activity.
      if (land) {
        const { x, y, z, warm, vienna } = land;
        const count = x.length;
        for (let i = 0; i < count; i++) {
          project(x[i], y[i], z[i]);
          px[i] = out.x;
          py[i] = out.y;
          pd[i] = out.depth;
          let h = vienna[i];
          for (let s = 0; s < warm.length; s++) h = Math.max(h, warm[s][i] * glow[s]);
          heat[i] = h;
        }
        const scale = R / 380;

        // One pass sorts every dot into its shade band; size follows depth exactly.
        const back = new Path2D();
        const shadePaths = Array.from({ length: DEPTH_BANDS }, () => new Path2D());
        const hotPaths = Array.from({ length: HEAT_BANDS }, () => new Path2D());
        for (let i = 0; i < count; i++) {
          const d = pd[i];
          if (d < 0) {
            back.rect(px[i] - 0.5, py[i] - 0.5, 1, 1);
            continue;
          }
          const r = Math.max(0.5, (0.55 + 0.85 * d) * scale * 1.15);
          const band = shadePaths[Math.min(DEPTH_BANDS - 1, Math.floor(d * DEPTH_BANDS))];
          band.moveTo(px[i] + r, py[i]);
          band.arc(px[i], py[i], r, 0, TAU);

          const h = (heat[i] - 0.06) / 0.94;
          if (d <= 0.05 || h <= 0) continue;
          const hr = Math.max(0.6, (0.6 + 0.9 * d) * scale * 1.2);
          const hot = hotPaths[Math.min(HEAT_BANDS - 1, Math.floor(h * HEAT_BANDS))];
          hot.moveTo(px[i] + hr, py[i]);
          hot.arc(px[i], py[i], hr, 0, TAU);
        }

        ctx.fillStyle = "rgba(138,150,163,0.08)";
        ctx.fill(back);
        shadePaths.forEach((path, b) => {
          ctx.fillStyle = `rgba(138,150,163,${(0.2 + (0.42 * (b + 0.5)) / DEPTH_BANDS).toFixed(3)})`;
          ctx.fill(path);
        });
        hotPaths.forEach((path, b) => {
          ctx.fillStyle = `rgba(245,161,66,${(0.3 + (0.56 * b) / (HEAT_BANDS - 1)).toFixed(3)})`;
          ctx.fill(path);
        });
      }

      // Arcs from Vienna
      for (const n of nodes) {
        if (n.progress <= 0) continue;
        const live = n.stage === index;
        const end = easeOutCubic(n.progress) * ARC_SAMPLES;
        ctx.beginPath();
        let pen = false;
        let tipX = 0;
        let tipY = 0;
        for (let i = 0; i <= Math.ceil(end); i++) {
          const k = Math.min(i, end);
          const j = Math.floor(k);
          const f = k - j;
          const a = j * 3;
          const b = Math.min(j + 1, ARC_SAMPLES) * 3;
          project(lerp(n.arc[a], n.arc[b], f), lerp(n.arc[a + 1], n.arc[b + 1], f), lerp(n.arc[a + 2], n.arc[b + 2], f));
          if (hidden()) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(out.x, out.y);
          else ctx.moveTo(out.x, out.y);
          pen = true;
          tipX = out.x;
          tipY = out.y;
        }
        if (live) {
          ctx.strokeStyle = "rgba(245,161,66,0.14)";
          ctx.lineWidth = 5;
          ctx.stroke();
        }
        ctx.strokeStyle = live ? "rgba(245,161,66,0.9)" : "rgba(245,161,66,0.3)";
        ctx.lineWidth = live ? 1.4 : 1;
        ctx.stroke();

        if (n.progress < 1 && pen) {
          ctx.beginPath();
          ctx.arc(tipX, tipY, 2.4, 0, TAU);
          ctx.fillStyle = "#ffd29a";
          ctx.fill();
        }

        // Comet travelling the finished arc
        if (live && n.landedAt >= 0 && !reduced) {
          const head = (((time - n.landedAt) / (2.2 + n.order * 0.25)) % 1) * ARC_SAMPLES;
          const tail = 9;
          for (let s = 0; s < tail; s++) {
            const i0 = Math.floor(head) - s;
            if (i0 < 1) break;
            project(n.arc[i0 * 3], n.arc[i0 * 3 + 1], n.arc[i0 * 3 + 2]);
            if (hidden()) continue;
            const x0 = out.x;
            const y0 = out.y;
            project(n.arc[(i0 - 1) * 3], n.arc[(i0 - 1) * 3 + 1], n.arc[(i0 - 1) * 3 + 2]);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(out.x, out.y);
            ctx.strokeStyle = `rgba(255,210,154,${0.9 * (1 - s / tail)})`;
            ctx.lineWidth = 2 - s * 0.15;
            ctx.stroke();
          }
        }
      }

      // Site pins, with an impact ring the moment an arc lands
      for (const n of nodes) {
        if (n.landedAt < 0) continue;
        project(n.vec[0], n.vec[1], n.vec[2]);
        if (out.depth < 0.04) continue;
        const live = n.stage === index;
        const fade = smoothstep(0.04, 0.3, out.depth);
        ctx.globalAlpha = fade * (live ? 1 : 0.55);
        ctx.beginPath();
        ctx.arc(out.x, out.y, live ? 2.8 : 2.2, 0, TAU);
        ctx.fillStyle = "#f5a142";
        ctx.fill();
        if (!reduced) {
          const hit = (time - n.landedAt) / 1.1;
          if (hit < 1) {
            ctx.beginPath();
            ctx.arc(out.x, out.y, 3 + 20 * easeOutCubic(hit), 0, TAU);
            ctx.strokeStyle = `rgba(255,210,154,${0.8 * (1 - hit)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (live) {
            const phase = ((time + n.order * 0.45) % 2.8) / 2.8;
            ctx.beginPath();
            ctx.arc(out.x, out.y, 3 + 8 * easeOutCubic(phase), 0, TAU);
            ctx.strokeStyle = `rgba(245,161,66,${0.5 * (1 - phase)})`;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // Vienna
      project(hq[0], hq[1], hq[2]);
      if (out.depth > 0.04) {
        ctx.globalAlpha = smoothstep(0.04, 0.3, out.depth);
        ctx.beginPath();
        ctx.arc(out.x, out.y, 7.5, 0, TAU);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(out.x, out.y, 3, 0, TAU);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.font = font;
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText("VIENNA", out.x + 13, out.y + 3.5);
        ctx.globalAlpha = 1;
      }

      // Rim light
      g = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R);
      g.addColorStop(0, "rgba(245,161,66,0)");
      g.addColorStop(1, "rgba(245,161,66,0.1)");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.stroke();

      const centreLat = lat.value;
      const centreLon = ((((lon.value + yaw.value + 180) % 360) + 360) % 360) - 180;
      const text = `${Math.abs(centreLat).toFixed(2)}° ${centreLat >= 0 ? "N" : "S"}  ${Math.abs(centreLon).toFixed(2)}° ${centreLon >= 0 ? "E" : "W"}`;
      if (text !== coordsText && coordsRef.current) {
        coordsText = text;
        coordsRef.current.textContent = text;
      }
    };

    const stop = animateWhileVisible(track, frame);
    return () => {
      cancelled = true;
      stop();
      stopResize();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [stages, sites, reduced]);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const span = track.offsetHeight - window.innerHeight;
    const top = track.getBoundingClientRect().top + window.scrollY + (span * i) / (stages.length - 1);
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  };

  const reached = stages.slice(0, stage + 1).reduce((sum, s) => sum + s.places.length, 0);

  return (
    <section id="reach" aria-labelledby="reach-title" className="relative bg-ink">
      <div ref={trackRef} className="relative h-[330svh]">
        <div className="sticky top-0 h-svh overflow-hidden">
          <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full touch-pan-y" />
          <div aria-hidden="true" className="reach-shade pointer-events-none absolute inset-0" />

          <div className="shell pointer-events-none relative flex h-full flex-col justify-between pb-8 pt-24 lg:justify-center lg:pb-0 lg:pt-0">
            <div className="lg:max-w-md">
              <SectionLabel index="02" className="text-white/60">
                Reach
              </SectionLabel>
              <h2
                id="reach-title"
                className="mt-5 text-[clamp(2rem,4.4vw,4.5rem)] font-medium leading-[1] tracking-[-0.035em] lg:mt-6"
              >
                {title}
              </h2>
            </div>

            <div className="lg:mt-14 lg:max-w-md">
              <div className="flex items-end gap-5">
                <p className="text-[clamp(4.5rem,9vw,8.5rem)] font-medium leading-[0.8] tracking-[-0.05em]">
                  <span className="sr-only">{reached}</span>
                  <Odometer value={reached} />
                </p>
                <div className="pb-1">
                  <p className="label-mono text-steel">Countries</p>
                  <p key={stage} className="fade-up mt-1 text-xl font-medium tracking-tight text-flare">
                    {stages[stage].label}
                  </p>
                </div>
              </div>
              <ul key={`places-${stage}`} className="mt-5 flex min-h-16 flex-wrap content-start gap-1.5 lg:min-h-20">
                {stages[stage].places.map((code, i) => (
                  <li
                    key={code}
                    className="fade-up flex h-7 items-center gap-2 rounded-full border border-white/12 bg-ink/60 pl-2 pr-3 text-xs text-white/75 backdrop-blur-md"
                    style={{ "--d": 120 + i * 60 } as CSSProperties}
                  >
                    <Flag code={code} className="size-3.5 rounded-full!" />
                    {countries[code]}
                  </li>
                ))}
              </ul>

              <div className="pointer-events-auto relative mt-6 grid grid-cols-3 border-t border-white/12 lg:mt-10">
                <span
                  aria-hidden="true"
                  className="absolute -top-px left-0 h-px w-full origin-left bg-flare"
                  style={{ transform: "scaleX(var(--travel, 0))" }}
                />
                {stages.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === stage || undefined}
                    className={`label-mono py-4 text-left transition-colors duration-500 ${
                      i === stage ? "text-white" : "text-white/40 hover:text-white/75"
                    }`}
                  >
                    <span className="text-flare">0{i + 1}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-8 right-12 hidden text-right font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 lg:block"
          >
            <p>Fig. 02 · Orbit view</p>
            <p className="mt-1 tabular-nums text-white/70">
              <span ref={coordsRef}>&nbsp;</span>
            </p>
            <p className="mt-3 text-white/35">Drag the globe</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

/** Rolling-digit counter: each digit is a 0–9 strip that slides into place. */
function Odometer({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="inline-flex tabular-nums">
      {String(value)
        .padStart(2, "0")
        .split("")
        .map((digit, i) => (
          <span key={i} className="relative inline-block h-[0.8em] w-[0.6em] overflow-hidden">
            <span
              className="odometer-strip absolute inset-x-0 top-0 flex flex-col"
              style={{ "--digit": digit, "--d": i * 90 } as CSSProperties}
            >
              {DIGITS.map((n) => (
                <span key={n} className="block h-[0.8em] text-center leading-[0.8]">
                  {n}
                </span>
              ))}
            </span>
          </span>
        ))}
    </span>
  );
}
