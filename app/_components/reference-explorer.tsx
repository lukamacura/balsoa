"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { ReferenceGroup } from "@/lib/content";
import { HQ, formatCoords } from "@/lib/map";
import { clamp, damp, easeOutCubic, useReducedMotion } from "./motion";
import { createPlanMap, type Insets, type PlanMap, type RGB } from "./plan-map";
import { Flag } from "./ui";

/** Each category keeps its own colour on the tabs, list, pins, arcs and glow. */
const TONES: Record<string, RGB> = {
  energy: [245, 161, 66],
  "oil-gas": [74, 196, 230],
  avl: [168, 146, 255],
};

const toneOf = (id: string) => TONES[id] ?? TONES.energy;
const css = ([r, g, b]: RGB) => `rgb(${r} ${g} ${b})`;

/** Gap between a pin and its tooltip card. */
const TIP_GAP = 18;

export function ReferenceExplorer({ groups }: { groups: ReferenceGroup[] }) {
  const [groupId, setGroupId] = useState(groups[0].id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const scaleBarRef = useRef<HTMLSpanElement>(null);
  const scaleLabelRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<PlanMap | null>(null);

  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const pins = useMemo(
    () => group.items.flatMap((item) => (item.coords ? [{ id: item.id, coords: item.coords }] : [])),
    [group],
  );
  const active = group.items.find((item) => item.id === activeId && item.coords);
  // The tooltip keeps the last pin's content while it fades out.
  const [tip, setTip] = useState(active);
  if (active && active !== tip) setTip(active);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    // Keep the framed area clear of whatever floats over the canvas (tabs, list panel, legend).
    const insets = (): Insets => {
      const box = canvas.getBoundingClientRect();
      const over = (el: HTMLElement | null) => {
        const r = el?.getBoundingClientRect();
        return r && r.width > 0 && r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top
          ? r
          : null;
      };
      const panel = over(panelRef.current);
      const tabs = over(tabsRef.current);
      return {
        top: tabs ? tabs.bottom - box.top + 8 : 12,
        right: panel ? box.right - panel.left + 8 : 12,
        bottom: 40,
        left: 12,
      };
    };

    const glide = { x: 0, y: 0, shown: false };
    let tilt = -1;
    let scaleKm = 0;

    const engine = createPlanMap(canvas, {
      reduced,
      insets,
      onHover: setActiveId,
      onFrame: ({ dt, width, inset, active, scaleKm: km, scalePx }) => {
        // The tooltip glides between pins instead of jumping, stays inside the clear area of
        // the map and drops below pins that sit too close to the top.
        const tooltip = tooltipRef.current;
        if (tooltip && active) {
          const w = tooltip.offsetWidth;
          const h = tooltip.offsetHeight;
          const below = active.y - h - TIP_GAP < inset.top;
          const x = clamp(active.x - w / 2, inset.left, Math.max(inset.left, width - inset.right - w));
          const y = below ? active.y + TIP_GAP : active.y - h - TIP_GAP;
          if (!glide.shown || reduced) {
            glide.x = x;
            glide.y = y;
          } else {
            glide.x = damp(glide.x, x, 16, dt);
            glide.y = damp(glide.y, y, 16, dt);
          }
          glide.shown = true;
          tooltip.style.transform = `translate3d(${glide.x.toFixed(1)}px, ${glide.y.toFixed(1)}px, 0)`;
          tooltip.style.setProperty("--ox", `${(active.x - glide.x).toFixed(1)}px`);
          tooltip.style.setProperty("--oy", `${below ? -TIP_GAP : h + TIP_GAP}px`);
          tooltip.style.opacity = "1";
        } else if (tooltip && glide.shown) {
          glide.shown = false;
          tooltip.style.opacity = "0";
        }

        if (scaleBarRef.current && scaleLabelRef.current && km !== scaleKm) {
          scaleKm = km;
          scaleLabelRef.current.textContent = `${km.toLocaleString("en")} km`;
        }
        if (scaleBarRef.current) scaleBarRef.current.style.width = `${scalePx.toFixed(1)}px`;

        // Entrance: the map tilts up from an oblique angle and flattens as it scrolls in.
        const enter = reduced ? 1 : easeOutCubic(clamp((window.innerHeight - stage.getBoundingClientRect().top) / (window.innerHeight * 0.8)));
        const next = Math.round((1 - enter) * 1000) / 1000;
        if (next !== tilt) {
          tilt = next;
          stage.style.transform = next
            ? `perspective(1800px) rotateX(${(next * 18).toFixed(2)}deg) scale(${(1 - next * 0.05).toFixed(4)})`
            : "";
          stage.style.opacity = String(1 - next * 0.5);
        }
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    engineRef.current?.setPins(pins);
  }, [pins, reduced]);

  useEffect(() => {
    engineRef.current?.setActive(activeId);
  }, [activeId, reduced]);

  useEffect(() => {
    engineRef.current?.setTone(toneOf(groupId));
  }, [groupId, reduced]);

  // Sliding tab indicator, measured from the selected tab.
  useLayoutEffect(() => {
    const place = () => {
      const pill = pillRef.current;
      const tab = tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!pill || !tab) return;
      pill.style.width = `${tab.offsetWidth}px`;
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      requestAnimationFrame(() => (pill.dataset.ready = ""));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [groupId]);

  const selectGroup = (id: string) => {
    setGroupId(id);
    setActiveId(null);
  };

  const onTabKey = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const index = (groups.findIndex((g) => g.id === groupId) + step + groups.length) % groups.length;
    selectGroup(groups[index].id);
    tabsRef.current?.querySelector<HTMLElement>(`#ref-tab-${groups[index].id}`)?.focus();
  };

  return (
    <div
      ref={stageRef}
      className="plan-stage relative origin-[50%_100%] overflow-hidden rounded-sm border border-white/10 lg:h-[min(86svh,880px)] lg:min-h-[620px]"
      style={{ "--tone": css(toneOf(group.id)) } as CSSProperties}
    >
      <div className="relative p-3 lg:absolute lg:left-4 lg:top-4 lg:z-10 lg:p-0">
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Reference categories"
          onKeyDown={onTabKey}
          className="no-scrollbar relative flex max-w-full overflow-x-auto rounded-full border border-white/12 bg-ink/70 p-1 backdrop-blur-xl lg:inline-flex"
        >
          <span ref={pillRef} aria-hidden="true" className="tab-pill absolute inset-y-1 left-0 rounded-full bg-(--tone)" />
          {groups.map((g) => {
            const selected = g.id === groupId;
            return (
              <button
                key={g.id}
                id={`ref-tab-${g.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="ref-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectGroup(g.id)}
                className={`relative flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-500 ${
                  selected ? "text-ink" : "text-white/65 hover:text-white"
                }`}
              >
                {g.label}
                <span
                  className={`font-mono text-xs transition-colors duration-500 ${selected ? "text-ink/60" : ""}`}
                  style={selected ? undefined : { color: css(toneOf(g.id)) }}
                >
                  {String(g.items.length).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />

        {tip && (
          <div
            ref={tooltipRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-10 opacity-0 transition-opacity duration-300"
          >
            <div
              key={tip.id}
              className="map-tip max-w-[calc(100vw-4.5rem)] rounded-sm border border-white/15 bg-ink/85 px-3.5 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
            >
              <p className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.16em]">
                <span className="flex items-center gap-2 text-(--tone)">
                  {tip.flags?.map((code) => <Flag key={code} code={code} />)}
                  {tip.place}
                </span>
                {tip.metric && <span className="shrink-0 text-white/60">{tip.metric}</span>}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{tip.title}</p>
              {tip.detail && <p className="mt-1 w-max max-w-60 text-xs leading-relaxed text-white/55">{tip.detail}</p>}
            </div>
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-x-6 gap-y-1 bg-linear-to-t from-[#05070b]/90 to-transparent p-4 pt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50"
        >
          <span>Fig. 04 · Plan view · {group.label}</span>
          <span className="tabular-nums text-white/70">{formatCoords(active?.coords ?? HQ.coords)}</span>
          <span className="flex items-center gap-2.5">
            <span ref={scaleBarRef} className="block h-1.5 w-16 border-x border-b border-white/45" />
            <span ref={scaleLabelRef}>500 km</span>
          </span>
        </div>
      </div>

      <div
        ref={panelRef}
        id="ref-panel"
        role="tabpanel"
        aria-labelledby={`ref-tab-${group.id}`}
        className="relative border-t border-white/10 p-5 lg:absolute lg:bottom-4 lg:right-4 lg:top-4 lg:z-10 lg:w-[23rem] lg:overflow-y-auto lg:rounded-sm lg:border lg:bg-ink/75 lg:backdrop-blur-xl"
      >
        <p key={group.id} className="ref-row text-sm leading-relaxed text-white/55">
          {group.intro}
        </p>
        <ul key={`list-${group.id}`} className="mt-4" onMouseLeave={() => setActiveId(null)}>
          {group.items.map((item, i) => {
            const isActive = item.id === activeId;
            return (
              <li key={item.id} className="ref-row border-t border-white/10 last:border-b" style={{ "--d": 60 + i * 50 } as CSSProperties}>
                <button
                  type="button"
                  onPointerEnter={() => setActiveId(item.coords ? item.id : null)}
                  onFocus={() => setActiveId(item.coords ? item.id : null)}
                  onClick={() => setActiveId(item.coords ? item.id : null)}
                  className={`relative block w-full py-3.5 pl-4 pr-1 text-left outline-none transition-colors duration-300 focus-visible:bg-white/[0.05] ${
                    isActive ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-px origin-top bg-(--tone) transition-transform duration-500 ease-out-expo ${
                      isActive ? "scale-y-100" : "scale-y-0"
                    }`}
                  />
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="label-mono flex items-center gap-2 text-steel">
                      {item.flags?.map((code) => <Flag key={code} code={code} />)}
                      {item.place}
                    </span>
                    {item.metric && <span className="shrink-0 font-mono text-xs text-(--tone)">{item.metric}</span>}
                  </span>
                  <span
                    className={`mt-1.5 block text-[17px] font-medium leading-snug tracking-tight transition-transform duration-500 ease-out-expo ${
                      isActive ? "translate-x-1" : ""
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.detail && (
                    <span className={`ref-detail lg:hidden ${isActive ? "is-open" : ""}`}>
                      <span className="overflow-hidden">
                        <span className="block pt-1.5 text-sm leading-relaxed text-white/55">{item.detail}</span>
                      </span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
