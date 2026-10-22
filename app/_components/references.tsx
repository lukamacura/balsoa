import { references } from "@/lib/content";
import { ReferenceExplorer } from "./reference-explorer";
import { SectionLabel } from "./ui";

export function References() {
  return (
    <section id="references" className="relative border-t border-white/10 bg-ink-2">
      <div className="shell py-28 lg:py-40">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel index="05" className="text-white/60">
              References
            </SectionLabel>
            <h2
              data-reveal
              className="mt-6 text-[clamp(2.25rem,4.8vw,4.75rem)] font-medium leading-[1] tracking-[-0.035em]"
            >
              {references.title}
            </h2>
          </div>
          <p data-reveal className="text-lg leading-relaxed text-white/60 lg:col-span-4 lg:col-start-9">
            {references.intro}
          </p>
        </div>

        <div className="mt-16 lg:mt-20">
          <ReferenceExplorer groups={references.groups} />
        </div>
      </div>
    </section>
  );
}
