import type { LonLat } from "@/lib/content";
import { HQ, MAP, project, type Point } from "@/lib/map";
import {
  animateWhileVisible,
  clamp,
  damp,
  easeOutCubic,
  loadDots,
  monoFont,
  smoothstep,
  spring,
  stepSpring,
  trackCanvasSize,
  type CanvasSize,
} from "./motion";

export type PlanPin = { id: string; coords: LonLat };
export type RGB = [r: number, g: number, b: number];
export type Insets = { top: number; right: number; bottom: number; left: number };
export type PlanFrame = {
  dt: number;
  /** Canvas size in CSS pixels, and the clear area inside it the camera frames. */
  width: number;
  height: number;
  inset: Insets;
  /** Active pin in canvas CSS pixels. */
  active: Point | null;
  scaleKm: number;
  scalePx: number;
};

type Entity = {
  id: string;
  point: Point;
  control: Point | null;
  index: number;
  born: number | null;
  delay: number;
  landedAt: number;
  leaving: boolean;
  fade: number;
  focus: number;
  lift: number;
};

const TAU = Math.PI * 2;
const UNITS_PER_DEG = MAP.width / (MAP.lon1 - MAP.lon0);
const DOT_SPACING = 0.7 * UNITS_PER_DEG; // must match the grid in /map/plan-dots.json
const ARC_SAMPLES = 40;
const NICE_KM = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];
const HEAT_BANDS = 8;
const HALO_R2 = 46 ** 2;

const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

/** Control point for a quadratic arc from a to b that always bows upwards. */
function arcControl(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 4) return null;
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: (a.x + b.x) / 2 + nx * length * 0.3, y: (a.y + b.y) / 2 + ny * length * 0.3 };
}

const quad = (a: number, c: number, b: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

const paint = (c: RGB, alpha: number) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha.toFixed(3)})`;

export function createPlanMap(
  canvas: HTMLCanvasElement,
  options: {
    reduced: boolean;
    insets: () => Insets;
    onHover: (id: string | null) => void;
    onFrame: (frame: PlanFrame) => void;
  },
) {
  const ctx = canvas.getContext("2d")!;
  const { reduced } = options;
  const size: CanvasSize = { width: 0, height: 0, dpr: 1 };
  const stopResize = trackCanvasSize(canvas, size);
  const hq = project(HQ.coords);
  const font = monoFont(10);

  let mx = new Float32Array(0);
  let my = new Float32Array(0);
  let warmth = new Float32Array(0);
  let cancelled = false;
  loadDots("/map/plan-dots.json").then((raw) => {
    if (cancelled) return;
    const count = raw.length / 2;
    mx = new Float32Array(count);
    my = new Float32Array(count);
    warmth = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const p = project([raw[i * 2] / 10, raw[i * 2 + 1] / 10]);
      mx[i] = p.x;
      my[i] = p.y;
      warmth[i] = 0.55 * Math.exp(-(((p.x - hq.x) ** 2 + (p.y - hq.y) ** 2) / 60 ** 2));
    }
  });

  const entities = new Map<string, Entity>();
  let activeId: string | null = null;
  let rippleAt = -10;
  let rippleQueued = false;
  let started = false;
  let hovering = false;

  const camX = spring(hq.x);
  const camY = spring(hq.y);
  const camK = spring(0);
  let primed = false;

  // Category colour; it glides to the new one when the tab changes.
  const tone: RGB = [245, 161, 66];
  const glint: RGB = [255, 210, 154];
  let toneTarget: RGB = [...tone];

  function setPins(pins: PlanPin[]) {
    const ids = new Set(pins.map((pin) => pin.id));
    for (const entity of entities.values()) if (!ids.has(entity.id)) entity.leaving = true;
    pins.forEach((pin, index) => {
      const existing = entities.get(pin.id);
      if (existing && !existing.leaving) return;
      const point = project(pin.coords);
      entities.set(pin.id, {
        id: pin.id,
        point,
        control: arcControl(hq, point),
        index,
        born: null,
        delay: 0.18 + index * 0.09,
        landedAt: -1,
        leaving: false,
        fade: 1,
        focus: 1,
        lift: 0,
      });
    });
    rippleQueued = true;
  }

  function setActive(id: string | null) {
    activeId = id;
  }

  function setTone(rgb: RGB) {
    toneTarget = rgb;
    if (!primed) tone.splice(0, 3, ...rgb);
  }

  // ---- Framing
  const live = () => [...entities.values()].filter((e) => !e.leaving);

  function frameTarget(width: number, height: number, inset: Insets) {
    const sw = width - inset.left - inset.right;
    const sh = height - inset.top - inset.bottom;
    const pad = Math.min(72, sw * 0.12);
    const points = [hq, ...live().map((e) => e.point)];
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // The framed area (not the parts under the panel or tabs) must stay on mapped land.
    const kMin = Math.max(sw / MAP.width, sh / MAP.height);
    const kMax = kMin * 3.2;
    let k = clamp(Math.min((sw - pad * 2) / Math.max(maxX - minX, 40), (sh - pad * 2) / Math.max(maxY - minY, 30)), kMin, kMax);
    let cx = (minX + maxX) / 2;
    let cy = (minY + maxY) / 2;

    const active = activeId ? entities.get(activeId) : undefined;
    if (active && !active.leaving) {
      cx += (active.point.x - cx) * 0.3;
      cy += (active.point.y - cy) * 0.3;
      k = Math.min(k * 1.12, kMax);
    }

    const sx = inset.left + sw / 2;
    const sy = inset.top + sh / 2;
    cx = clamp(cx, sw / 2 / k, MAP.width - sw / 2 / k);
    cy = clamp(cy, sh / 2 / k, MAP.height - sh / 2 / k);
    return { cx, cy, k, kMin, sx, sy };
  }

  // ---- Pointer
  const pinAt = (x: number, y: number) => {
    let best: string | null = null;
    let bestDistance = 22 * 22;
    const k = Math.exp(camK.value);
    for (const e of live()) {
      if (e.landedAt < 0) continue;
      const dx = (e.point.x - camX.value) * k + target.sx - x;
      const dy = (e.point.y - camY.value) * k + target.sy - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = e.id;
      }
    }
    return best;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const box = canvas.getBoundingClientRect();
    const id = pinAt(e.clientX - box.left, e.clientY - box.top);
    canvas.style.cursor = id ? "pointer" : "";
    if (id) {
      hovering = true;
      options.onHover(id);
    } else if (hovering) {
      hovering = false;
      options.onHover(null);
    }
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (hovering) options.onHover(null);
    hovering = false;
  };
  // Touch and pen: a tap on a pin selects it and the selection stays after the finger lifts.
  // Taps on open map and scroll gestures leave it alone.
  let tapFrom: Point | null = null;
  const onDown = (e: PointerEvent) => {
    tapFrom = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!tapFrom || Math.hypot(e.clientX - tapFrom.x, e.clientY - tapFrom.y) > 10) return;
    tapFrom = null;
    const box = canvas.getBoundingClientRect();
    const id = pinAt(e.clientX - box.left, e.clientY - box.top);
    if (id) options.onHover(id);
  };
  const onCancel = () => (tapFrom = null);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);

  let target = { cx: hq.x, cy: hq.y, k: 1, kMin: 1, sx: 0, sy: 0 };
  let scaleKm = 0;
  let scalePx = 0;

  const frame = (dt: number, time: number) => {
    const { width, height, dpr } = size;
    if (!width || !height) return;

    // Start the reveal once the map is properly on screen, not when it first peeks in.
    if (!started && canvas.getBoundingClientRect().top < window.innerHeight * 0.7) {
      started = true;
      rippleQueued = true;
    }
    if (started) {
      for (const e of entities.values()) if (e.born === null) e.born = time + (reduced ? -10 : e.delay);
      if (rippleQueued) {
        rippleAt = time + 0.1;
        rippleQueued = false;
      }
    }

    const inset = options.insets();
    target = frameTarget(width, height, inset);
    const flyDistance = Math.hypot(camX.value - target.cx, camY.value - target.cy) * Math.exp(camK.value);
    const zoomTarget = Math.max(Math.log(target.kMin), Math.log(target.k) - 0.6 * smoothstep(0, width * 0.8, flyDistance));
    if (!primed || reduced) {
      camX.value = target.cx;
      camY.value = target.cy;
      camK.value = reduced ? Math.log(target.k) : Math.max(Math.log(target.kMin), Math.log(target.k) - 0.18);
      primed = true;
    }
    if (!reduced) {
      stepSpring(camX, target.cx, dt, 1);
      stepSpring(camY, target.cy, dt, 1);
      stepSpring(camK, zoomTarget, dt, 1);
    }

    for (let c = 0; c < 3; c++) {
      tone[c] = reduced ? toneTarget[c] : damp(tone[c], toneTarget[c], 5, dt);
      glint[c] = tone[c] + (255 - tone[c]) * 0.5;
    }

    const k = Math.exp(camK.value);
    const ox = target.sx - camX.value * k;
    const oy = target.sy - camY.value * k;
    const toX = (x: number) => x * k + ox;
    const toY = (y: number) => y * k + oy;
    const hqX = toX(hq.x);
    const hqY = toY(hq.y);

    // Entity state
    const active = activeId ? entities.get(activeId) : undefined;
    for (const e of entities.values()) {
      if (e.leaving) {
        e.fade = reduced ? 0 : damp(e.fade, 0, 9, dt);
        if (e.fade < 0.01) entities.delete(e.id);
      }
      const appear = e.born === null ? 0 : clamp((time - e.born) / 1.1);
      if (appear >= 1 && e.landedAt < 0) e.landedAt = time;
      e.focus = damp(e.focus, !active || active === e ? 1 : 0.22, 10, dt);
      e.lift = damp(e.lift, active === e ? 1 : 0, 12, dt);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // ---- Dots, with warmth around Vienna, a halo round each pin, a ripple after each change,
    // and a glow on the active pin.
    const count = mx.length;
    if (count) {
      const r = Math.min(0.5 + DOT_SPACING * k * 0.13, 2.6);
      // Tiny dots read the same as squares and are far cheaper to fill.
      const dot =
        r < 1.3
          ? (path: Path2D, x: number, y: number) => path.rect(x - r, y - r, r * 2, r * 2)
          : (path: Path2D, x: number, y: number) => {
              path.moveTo(x + r, y);
              path.arc(x, y, r, 0, TAU);
            };
      const rippleAge = time - rippleAt;
      const rippleOn = !reduced && rippleAge > 0 && rippleAge < 1.8;
      const ring = rippleAge * 1050;
      const activeX = active ? toX(active.point.x) : 0;
      const activeY = active ? toY(active.point.y) : 0;
      const activeGlow = active ? active.lift : 0;
      const halos: { x: number; y: number; strength: number }[] = [];
      for (const e of entities.values()) {
        if (e.landedAt < 0) continue;
        const strength = e.fade * clamp((time - e.landedAt) / 0.8) * (0.26 + 0.34 * e.focus);
        if (strength > 0.01) halos.push({ x: toX(e.point.x), y: toY(e.point.y), strength });
      }

      const base = new Path2D();
      const hot = Array.from({ length: HEAT_BANDS }, () => new Path2D());
      for (let i = 0; i < count; i++) {
        const x = mx[i] * k + ox;
        const y = my[i] * k + oy;
        if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
        dot(base, x, y);
        let h = warmth[i];
        if (rippleOn) {
          const d = Math.hypot(x - hqX, y - hqY) - ring;
          h = Math.max(h, Math.exp(-(d * d) / 3000) * (1 - rippleAge / 1.8) * 0.85);
        }
        if (activeGlow > 0.01) {
          const d2 = (x - activeX) ** 2 + (y - activeY) ** 2;
          h = Math.max(h, Math.exp(-d2 / 2200) * 0.9 * activeGlow);
        }
        for (const halo of halos) {
          const d2 = (x - halo.x) ** 2 + (y - halo.y) ** 2;
          if (d2 < HALO_R2 * 4) h = Math.max(h, Math.exp(-d2 / HALO_R2) * halo.strength);
        }
        const band = (h - 0.06) / 0.94;
        if (band > 0) dot(hot[Math.min(HEAT_BANDS - 1, Math.floor(band * HEAT_BANDS))], x, y);
      }
      ctx.fillStyle = "rgba(124,150,184,0.34)";
      ctx.fill(base);
      hot.forEach((path, b) => {
        ctx.fillStyle = paint(tone, 0.22 + (0.72 * b) / (HEAT_BANDS - 1));
        ctx.fill(path);
      });
    }

    // ---- Arcs and comets
    for (const e of entities.values()) {
      if (!e.control || e.born === null) continue;
      const appear = clamp((time - e.born) / 1.1);
      if (appear <= 0) continue;
      const ax = hqX;
      const ay = hqY;
      const cx = toX(e.control.x);
      const cy = toY(e.control.y);
      const bx = toX(e.point.x);
      const by = toY(e.point.y);
      const end = easeOutCubic(appear);
      const alpha = e.fade * e.focus;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      for (let i = 1; i <= ARC_SAMPLES; i++) {
        const t = Math.min(i / ARC_SAMPLES, end);
        ctx.lineTo(quad(ax, cx, bx, t), quad(ay, cy, by, t));
        if (t >= end) break;
      }
      if (e.lift > 0.01) {
        ctx.strokeStyle = paint(tone, 0.18 * e.lift);
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.strokeStyle = paint(tone, 0.6 * alpha + 0.4 * e.lift);
      ctx.lineWidth = 1 + e.lift;
      ctx.stroke();

      if (appear < 1) {
        ctx.beginPath();
        ctx.arc(quad(ax, cx, bx, end), quad(ay, cy, by, end), 2.4, 0, TAU);
        ctx.fillStyle = paint(glint, e.fade);
        ctx.fill();
      } else if (!reduced && !e.leaving) {
        const head = (((time - e.landedAt) / (2.4 + (e.index % 4) * 0.45)) % 1) * 1.15;
        for (let s = 0; s < 10; s++) {
          const t1 = head - s * 0.014;
          const t0 = t1 - 0.014;
          if (t1 > 1 || t0 < 0) continue;
          ctx.beginPath();
          ctx.moveTo(quad(ax, cx, bx, t0), quad(ay, cy, by, t0));
          ctx.lineTo(quad(ax, cx, bx, t1), quad(ay, cy, by, t1));
          ctx.strokeStyle = paint(glint, (1 - s / 10) * 0.95 * (0.35 + 0.65 * e.focus));
          ctx.lineWidth = 2.2 - s * 0.16;
          ctx.stroke();
        }
      }
    }

    // ---- Pins
    for (const e of entities.values()) {
      if (e.landedAt < 0) continue;
      const x = toX(e.point.x);
      const y = toY(e.point.y);
      const pop = reduced ? 1 : Math.max(0, easeOutBack(clamp((time - e.landedAt) / 0.55)));
      const alpha = e.fade * (0.35 + 0.65 * e.focus);
      const r0 = (3.2 + 1.4 * e.lift) * pop;
      ctx.globalAlpha = alpha;

      if (!reduced) {
        const hit = (time - e.landedAt) / 0.9;
        const phase = ((time + e.index * 0.31) % 2.6) / 2.6;
        const ripple = hit < 1 ? hit : phase;
        ctx.beginPath();
        ctx.arc(x, y, r0 + (hit < 1 ? 22 : 13) * easeOutCubic(ripple), 0, TAU);
        ctx.strokeStyle = paint(tone, (hit < 1 ? 0.9 : 0.55) * (1 - ripple));
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, r0, 0, TAU);
      ctx.fillStyle = paint(tone, 1);
      ctx.fill();
      if (e.lift > 0.01) {
        ctx.beginPath();
        ctx.arc(x, y, 6 + 4 * e.lift, 0, TAU);
        ctx.strokeStyle = paint(glint, e.lift);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ---- Vienna
    ctx.beginPath();
    ctx.arc(hqX, hqY, 8, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hqX, hqY, 3.4, 0, TAU);
    ctx.fillStyle = "#fff";
    ctx.fill();
    // Label sits up-left of the dot unless that would run off the canvas edge.
    const flip = hqX < 110;
    ctx.font = font;
    ctx.textAlign = flip ? "left" : "right";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("VIENNA HQ", flip ? hqX + 13 : hqX - 13, hqY - 9);
    ctx.textAlign = "left";

    // ---- Scale bar, computed at the latitude in the middle of the view
    const centreLat = MAP.lat0 - (camY.value / MAP.height) * (MAP.lat0 - MAP.lat1);
    const pxPerKm = k / ((111.32 * Math.cos((centreLat * Math.PI) / 180)) / UNITS_PER_DEG);
    scaleKm = NICE_KM.find((km) => km * pxPerKm >= 56) ?? NICE_KM[NICE_KM.length - 1];
    scalePx = scaleKm * pxPerKm;

    options.onFrame({
      dt,
      width,
      height,
      inset,
      active: active && active.landedAt >= 0 ? { x: toX(active.point.x), y: toY(active.point.y) } : null,
      scaleKm,
      scalePx,
    });
  };

  const stop = animateWhileVisible(canvas, frame, "25% 0px");

  return {
    setPins,
    setActive,
    setTone,
    destroy() {
      cancelled = true;
      stop();
      stopResize();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
    },
  };
}

export type PlanMap = ReturnType<typeof createPlanMap>;
