import { numbers } from "@/lib/content";
import { checkMark, handwrite, scribbleCircle, scribbleLine, type Stroke } from "@/lib/handwriting";
import { CalcSheet } from "./calc-sheet";
import { SectionLabel } from "./ui";

// Sheet geometry in SVG units. The paper box is mirrored by .clipboard-paper in globals.css.
const W = 680;
const H = 960;
const PAPER = { x: 44, y: 86, w: 592, h: 840 };
const GRID = 20;
const SIZE = 31;
const LABEL_X = 76;
const VALUE_X = 262;

type Ink = Stroke & { marker?: boolean };

/** Everything the pen writes, in writing order. Baselines sit on the grid lines. */
function layoutInk() {
  const ink: Ink[] = [];
  const pen = (...strokes: Stroke[]) => ink.push(...strokes);
  const marker = (stroke: Stroke) => ink.push({ ...stroke, marker: true });

  pen(...handwrite(numbers.project, 162, 226, 26, 7).strokes);

  let baseline = PAPER.y + GRID * 11;
  numbers.sheet.forEach((row, i) => {
    if (row.heading) {
      if (i > 0) baseline += GRID;
      const { strokes, width } = handwrite(row.heading, LABEL_X, baseline, SIZE, i + 1);
      pen(...strokes, scribbleLine(LABEL_X - 2, baseline + 8, LABEL_X + width + 6, baseline + 6, i + 40));
    } else {
      if (row.label) pen(...handwrite(row.label, LABEL_X, baseline, SIZE, i + 1).strokes);
      if (row.sum) pen(...handwrite("+", VALUE_X - 32, baseline, SIZE, i + 60).strokes);
      const value = handwrite(row.value ?? "", VALUE_X, baseline, SIZE, i + 20);
      pen(...value.strokes);
      const end = VALUE_X + value.width;
      if (row.sum) pen(scribbleLine(VALUE_X - 42, baseline + 13, end + 10, baseline + 11, i + 70));
      if (row.mark === "underline") {
        pen(scribbleLine(VALUE_X - 4, baseline + 9, end + 8, baseline + 7, i + 80));
        pen(scribbleLine(VALUE_X, baseline + 15, end + 4, baseline + 13, i + 81));
      }
      if (row.mark === "circle") marker(scribbleCircle(VALUE_X + value.width / 2 - 2, baseline - 11, value.width / 2 + 22, 26, i));
      if (row.mark === "check") marker(checkMark(end + 18, baseline - 2, 30));
    }
    baseline += GRID * 2;
  });

  // Sign-off box at the foot of the sheet
  pen(...handwrite("BC", 178, 866, 30, 91).strokes);
  marker(checkMark(232, 864, 26));
  return ink;
}

export function Numbers() {
  const ink = layoutInk();

  return (
    <section id="numbers" aria-labelledby="numbers-title" className="numbers-desk relative overflow-hidden bg-ink-3">
      <div className="shell grid gap-14 py-28 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-36">
        <div className="lg:col-span-4">
          <SectionLabel index="04" className="text-white/60">
            Numbers
          </SectionLabel>
          <h2
            id="numbers-title"
            data-reveal
            className="mt-6 text-[clamp(2.25rem,4.4vw,4.25rem)] font-medium leading-[1] tracking-[-0.035em]"
          >
            {numbers.title}
          </h2>
          <p data-reveal className="mt-6 max-w-sm text-lg leading-relaxed text-white/60">
            {numbers.intro}
          </p>
          {/* Screen readers get the worked sheet as plain text. */}
          <ul className="sr-only">
            {numbers.sheet.map((row, i) => (
              <li key={i}>{row.heading ?? [row.label, row.value].filter(Boolean).join(": ")}</li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <CalcSheet width={W} height={H} restX={598} restY={884}>
            <defs>
              <pattern id="calc-grid" x={PAPER.x} y={PAPER.y} width={100} height={100} patternUnits="userSpaceOnUse">
                <path
                  d="M20 0V100M40 0V100M60 0V100M80 0V100M0 20H100M0 40H100M0 60H100M0 80H100"
                  stroke="rgb(70 125 165 / 0.2)"
                  strokeWidth="0.8"
                />
                <path d="M0 0V100M0 0H100" stroke="rgb(70 125 165 / 0.38)" strokeWidth="1" />
              </pattern>
              <linearGradient id="clip-chrome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f6f8fa" />
                <stop offset="0.45" stopColor="#b6bec7" />
                <stop offset="0.55" stopColor="#8d959e" />
                <stop offset="1" stopColor="#dde2e7" />
              </linearGradient>
              <linearGradient id="clip-jaw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#cfd5db" />
                <stop offset="1" stopColor="#7d858e" />
              </linearGradient>
              <radialGradient id="clip-rivet" cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#7f8791" />
              </radialGradient>
              <filter id="clip-shadow" x="-20%" y="-20%" width="140%" height="160%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>

            <rect x={PAPER.x} y={PAPER.y} width={PAPER.w} height={PAPER.h} fill="url(#calc-grid)" />

            {/* Printed pad header */}
            <g fontFamily="var(--font-mono)" fill="#5b6876" letterSpacing="2.4">
              <text x={LABEL_X} y={172} fontSize="13" fontWeight="600" fill="#2f3a46">
                BALSOA CONSULTING
              </text>
              <text x={PAPER.x + PAPER.w - 32} y={172} fontSize="10" textAnchor="end">
                CALCULATION SHEET
              </text>
              <text x={LABEL_X} y={226} fontSize="10">
                PROJECT
              </text>
              <text x={PAPER.x + PAPER.w - 32} y={226} fontSize="10" textAnchor="end">
                SHEET 01 / 01
              </text>
              <text x={LABEL_X} y={866} fontSize="10">
                CHECKED
              </text>
            </g>
            <g stroke="#5b6876" strokeWidth="0.9" opacity="0.7">
              <path d={`M150 232H470M${PAPER.x + 20} 252H${PAPER.x + PAPER.w - 20}M${PAPER.x + 20} 256H${PAPER.x + PAPER.w - 20}M162 872H300`} />
            </g>

            {/* Handwriting, drawn in this order */}
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {ink.map((stroke, i) =>
                stroke.marker ? (
                  <path
                    key={i}
                    d={stroke.d}
                    data-ink
                    data-pause={stroke.pause || undefined}
                    data-marker
                    className="calc-marker"
                    stroke="#e0701f"
                    strokeWidth="5"
                    strokeOpacity="0.78"
                  />
                ) : (
                  <path
                    key={i}
                    d={stroke.d}
                    data-ink
                    data-pause={stroke.pause || undefined}
                    stroke="#1f3576"
                    strokeWidth="2.3"
                    strokeOpacity="0.93"
                  />
                ),
              )}
            </g>

            {/* Metal clip, on top of the paper */}
            <rect x="222" y="58" width="236" height="84" rx="16" fill="#000" opacity="0.4" filter="url(#clip-shadow)" />
            <rect x="214" y="110" width="252" height="26" rx="10" fill="url(#clip-jaw)" />
            <rect x="230" y="36" width="220" height="86" rx="16" fill="url(#clip-chrome)" />
            <rect x="230.5" y="36.5" width="219" height="85" rx="15.5" fill="none" stroke="#fff" strokeOpacity="0.55" />
            <path
              d="M262 34 C262 8 284 0 340 0 C396 0 418 8 418 34 L392 34 C392 22 380 18 340 18 C300 18 288 22 288 34 Z"
              fill="url(#clip-chrome)"
              stroke="#7d858e"
              strokeWidth="1"
            />
            <circle cx="258" cy="80" r="7" fill="url(#clip-rivet)" />
            <circle cx="422" cy="80" r="7" fill="url(#clip-rivet)" />
            <path d="M246 104H434" stroke="#fff" strokeOpacity="0.5" />
          </CalcSheet>
        </div>
      </div>
    </section>
  );
}
