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

        <div className="mt-20 grid gap-12 border-t border-ink/15 pt-12 lg:mt-28 lg:grid-cols-12">
          <p data-reveal className="text-lg leading-relaxed text-ink/70 lg:col-span-5 lg:col-start-4">
            {about.body}
          </p>
          <ul className="grid gap-8 sm:grid-cols-3 lg:col-span-9 lg:col-start-4 lg:mt-8">
            {about.pillars.map((pillar, i) => (
              <li
                key={pillar.title}
                data-reveal
                style={{ "--d": i * 120 } as CSSProperties}
                className="border-t-2 border-ink pt-5"
              >
                <p className="font-mono text-xs text-flare-deep">0{i + 1}</p>
                <h3 className="mt-3 text-xl font-medium tracking-tight">{pillar.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/60">{pillar.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
