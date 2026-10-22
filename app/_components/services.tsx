import type { CSSProperties } from "react";
import { services } from "@/lib/content";
import { PipelineProgress } from "./pipeline-progress";
import { SectionLabel, ServiceGlyph } from "./ui";

export function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="relative bg-paper text-ink">
      <PipelineProgress className="pipeline relative lg:h-[250svh]">
        <div className="drafting-grid relative overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-center">
          <div className="shell py-28 lg:py-0 lg:pt-12">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <SectionLabel index="03" className="text-ink/60">
                  Services
                </SectionLabel>
                <h2
                  id="services-title"
                  data-reveal
                  className="mt-6 text-[clamp(2.25rem,4.4vw,4.25rem)] font-medium leading-[1] tracking-[-0.035em]"
                >
                  {services.title}
                </h2>
              </div>
              <div data-reveal className="lg:col-span-4 lg:col-start-9">
                <p className="text-lg leading-relaxed text-ink/65">{services.intro}</p>
                <p aria-hidden="true" className="label-mono mt-5 flex items-center gap-3 text-ink/50">
                  <span className="h-px w-8 bg-current opacity-40" />
                  Flow
                  <span className="tabular-nums text-flare-deep">
                    <span data-gauge>100</span>%
                  </span>
                </p>
              </div>
            </div>

            <div className="relative mt-16 lg:mt-20">
              <div aria-hidden="true" data-pipe className="pipe">
                <span className="pipe-fill" />
                <span className="pipe-head" />
              </div>

              <ol className="relative grid gap-16 lg:grid-cols-3 lg:gap-10">
                {services.items.map((service, i) => (
                  <li
                    key={service.id}
                    data-station
                    className="grid grid-cols-[var(--node)_1fr] gap-x-5 lg:block"
                  >
                    <div data-station-node className="station-node relative flex size-(--node) items-center justify-center rounded-full">
                      <ServiceGlyph id={service.id} className="station-glyph size-9 lg:size-11" />
                    </div>
                    <div className="pt-3 lg:mt-8 lg:pt-0">
                      <p className="station-fade font-mono text-xs text-flare-deep">0{i + 1}</p>
                      <h3 className="station-fade mt-2 text-2xl font-medium tracking-tight xl:text-3xl">{service.title}</h3>
                      <p className="station-fade mt-3 max-w-sm leading-relaxed text-ink/60">{service.summary}</p>
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {service.points.map((point, j) => (
                          <li
                            key={point}
                            className="station-chip rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-sm text-ink/75"
                            style={{ "--d": 140 + j * 70 } as CSSProperties}
                          >
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div
              aria-hidden="true"
              className="mt-12 hidden items-end gap-10 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45 lg:flex"
            >
              <div className="flex flex-1 items-center gap-4 pb-4">
                <span>Concept</span>
                <span className="dimension-line h-px flex-1 bg-ink/25" />
                <span>Commissioning</span>
              </div>
              <div className="grid shrink-0 grid-cols-[auto_auto] bg-paper tracking-[0.16em] text-ink/55">
                <span className="border border-ink/20 px-3 py-2">Balsoa Consulting</span>
                <span className="border border-l-0 border-ink/20 px-3 py-2">DWG 03</span>
                <span className="border border-t-0 border-ink/20 px-3 py-2">Section view · Process line</span>
                <span className="border border-l-0 border-t-0 border-ink/20 px-3 py-2">Scale NTS</span>
              </div>
            </div>
          </div>
        </div>
      </PipelineProgress>
    </section>
  );
}
