import Image from "next/image";
import type { CSSProperties } from "react";
import { about } from "@/lib/content";
import { ScrollWords } from "./scroll-words";
import { SectionLabel } from "./ui";

export function About() {
  return (
    <section id="about" className="relative bg-paper text-ink">
      <div className="shell py-28 lg:py-40">
        <div className="grid gap-10 lg:grid-cols-12">
          <SectionLabel index="01" className="text-ink/60 lg:col-span-3 lg:pt-4">
            About
          </SectionLabel>
          <ScrollWords
            text={about.statement}
            className="text-[clamp(1.75rem,3.6vw,3.6rem)] font-medium leading-[1.08] tracking-[-0.03em] lg:col-span-9"
          />
        </div>

        <figure className="about-wide mt-16 lg:mt-24">
          <div className="relative">
            <div className="about-wide-frame relative aspect-[4/3] overflow-hidden rounded-sm bg-ink-3 sm:aspect-[21/9]">
              <Image
                src={about.image.src}
                alt={about.image.alt}
                fill
                placeholder="blur"
                sizes="(min-width: 1440px) 1344px, 94vw"
                className="about-wide-img object-cover object-[64%_50%]"
              />
              <span aria-hidden="true" className="about-wide-veil absolute inset-0 bg-ink" />
            </div>
            <span aria-hidden="true" className="about-wide-marks crop-marks pointer-events-none absolute -inset-2.5 sm:-inset-3.5" />
          </div>
          <figcaption data-reveal className="label-mono mt-7 flex items-center gap-4 text-ink/50">
            <span className="text-flare-deep">Fig. 01</span>
            <span className="h-px flex-1 bg-ink/15" />
            <span>{about.image.caption}</span>
          </figcaption>
        </figure>

        <div className="about-pillars-scope mt-16 grid gap-12 lg:mt-24 lg:grid-cols-12">
          <p data-reveal className="text-lg leading-relaxed text-ink/70 lg:col-span-5 lg:col-start-4">
            {about.body}
          </p>
          <div className="lg:col-span-9 lg:col-start-4 lg:mt-8">
            {/* One swipeable row on phones, three columns from sm up. */}
            <ul
              data-reveal-group
              className="about-pillars no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-4 scroll-px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0 sm:pb-0"
            >
              {about.pillars.map((pillar, i) => (
                <li
                  key={pillar.title}
                  style={{ "--d": i * 140 } as CSSProperties}
                  className="about-pillar w-[78%] shrink-0 snap-start sm:w-auto"
                >
                  <div className="about-pillar-frame relative aspect-[4/5] overflow-hidden rounded-sm bg-ink-3">
                    <div className="about-pillar-drift absolute -inset-[8%]">
                      <Image
                        src={pillar.image.src}
                        alt={pillar.image.alt}
                        fill
                        placeholder="blur"
                        sizes="(min-width: 1440px) 368px, (min-width: 1024px) 26vw, (min-width: 640px) 36vw, 82vw"
                        className="about-pillar-img object-cover"
                      />
                    </div>
                  </div>
                  <div className="about-pillar-copy relative mt-6 pt-5">
                    <span aria-hidden="true" className="about-pillar-rule absolute inset-x-0 top-0 h-0.5 bg-ink" />
                    <p className="font-mono text-xs text-flare-deep">0{i + 1}</p>
                    <h3 className="mt-3 text-xl font-medium tracking-tight">{pillar.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink/60">{pillar.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div aria-hidden="true" className="about-pillars-progress relative mt-4 h-px overflow-hidden bg-ink/15">
              <span className="absolute inset-y-0 left-0 w-1/3 bg-ink" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
