import { GLYPHS } from "./handwriting-glyphs";

export type Stroke = { d: string; pause?: boolean };

/** Small deterministic PRNG so the "hand" wobbles the same way on every render. */
function random(seed: number) {
  let a = seed * 9301 + 49297;
  return () => {
    a = (a * 16807) % 2147483647;
    return (a % 10000) / 10000;
  };
}

/**
 * Lays out `text` in a single-stroke engineer's hand, one path per glyph, so each glyph can
 * be drawn like a pen stroke. `baseline` is in SVG units (y down).
 */
export function handwrite(text: string, x: number, baseline: number, size: number, seed = 1) {
  const rand = random(seed);
  const scale = size / 1000;
  const strokes: Stroke[] = [];
  let cursor = x;

  [...text].forEach((char, i) => {
    const [advance, d] = GLYPHS[char] ?? GLYPHS["?"];
    if (d) {
      const s = scale * (1 + (rand() - 0.5) * 0.07);
      const lift = baseline - i * 0.12 + (rand() - 0.5) * size * 0.05;
      const slant = (rand() - 0.5) * 0.05;
      strokes.push({
        d: d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, gx: string, gy: string) => {
          const px = Number(gx) * s;
          const py = Number(gy) * s;
          return `${(cursor + px + py * slant).toFixed(1)} ${(lift - py).toFixed(1)}`;
        }),
        pause: strokes.length === 0,
      });
    }
    cursor += advance * scale;
  });

  return { strokes, width: cursor - x };
}

/** A ruled line drawn freehand: never quite straight, slightly heavier in the middle. */
export function scribbleLine(x1: number, y1: number, x2: number, y2: number, seed = 1): Stroke {
  const rand = random(seed);
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * 8;
  const my = (y1 + y2) / 2 + (rand() - 0.5) * 3;
  return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, pause: true };
}

/** A loose hand-drawn ellipse that overshoots its start, the way a marker circle does. */
export function scribbleCircle(cx: number, cy: number, rx: number, ry: number, seed = 1): Stroke {
  const rand = random(seed);
  const start = -2.3;
  const sweep = Math.PI * 2 + 0.55;
  const points: [number, number][] = [];
  for (let i = 0; i <= 28; i++) {
    const a = start + (sweep * i) / 28;
    const wobble = 1 + (rand() - 0.5) * 0.06 + (i / 28) * 0.06;
    points.push([cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble]);
  }
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += `Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }
  return { d, pause: true };
}

export function checkMark(x: number, y: number, size: number): Stroke {
  return {
    d: `M${x} ${y - size * 0.35}Q${x + size * 0.18} ${y - size * 0.1} ${x + size * 0.32} ${y}Q${x + size * 0.55} ${y - size * 0.55} ${x + size} ${y - size * 0.95}`,
    pause: true,
  };
}
