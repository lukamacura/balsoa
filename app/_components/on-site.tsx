import Image from "next/image";
import { onSite, type SiteRow } from "@/lib/content";
import { ArrowIcon, SectionLabel } from "./ui";

// Mirrors --row-h in globals.css (clamp(12rem, 22vw, 24rem)) so each photo gets the right srcset entry.
function sizesFor(ratio: number) {
  return `(max-width: 872px) ${Math.round(ratio * 192)}px, (max-width: 1745px) ${(ratio * 22).toFixed(1)}vw, ${Math.round(ratio * 384)}px`;
}

function RowLabel({ label, direction }: Pick<SiteRow, "label" | "direction">) {
  const arrow = (
    <ArrowIcon className={`h-3.5 w-3.5 shrink-0 text-flare ${direction === "left" ? "rotate-180" : ""}`} />
  );
  return (
    <p className="label-mono shell flex items-center gap-4 text-steel">
      {direction === "left" && arrow}
      {direction === "right" && <span>{label}</span>}
      <span className="h-px flex-1 bg-white/10" />
      {direction === "left" && <span>{label}</span>}
      {direction === "right" && arrow}
    </p>
  );
}

function PhotoRow({ row }: { row: SiteRow }) {
  return (
    <div className="site-row" data-dir={row.direction}>
      <div className="site-row-drift">
        {/* Three copies: the middle one is read out, the outer two keep both edges covered while it loops. */}
        <div className="site-row-track flex w-max">
          {[0, 1, 2].map((copy) => (
            <ul key={copy} aria-hidden={copy !== 1 || undefined} className="flex shrink-0">
              {row.photos.map(({ src, caption }) => (
                <li key={caption} className="mr-3 sm:mr-4">
                  <figure
                    className="group relative h-(--row-h) overflow-hidden rounded-sm bg-ink-3"
                    style={{ aspectRatio: `${src.width} / ${src.height}` }}
                  >
                    <Image
                      src={src}
                      alt={caption}
                      fill
                      placeholder="blur"
                      sizes={sizesFor(src.width / src.height)}
                      className="object-cover transition-transform duration-1000 ease-out-expo group-hover:scale-[1.04]"
                    />
                    <figcaption className="label-mono absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/80 to-transparent px-4 pb-3.5 pt-12 text-white/85">
                      {caption}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OnSite() {
  const [top, bottom] = onSite.rows;

  return (
    // overflow-x-clip, not hidden: a hidden section would become the rows' view() scroller and freeze their drift.
    <section aria-labelledby="on-site-title" className="relative overflow-x-clip border-t border-white/10 bg-ink py-28 lg:py-40">
      <div className="shell grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionLabel className="text-white/60">{onSite.label}</SectionLabel>
          <h2
            id="on-site-title"
            data-reveal
            className="mt-6 text-[clamp(2.25rem,4.8vw,4.75rem)] font-medium leading-[1] tracking-[-0.035em]"
          >
            {onSite.title}
          </h2>
        </div>
        <p data-reveal className="text-lg leading-relaxed text-white/60 lg:col-span-4 lg:col-start-9">
          {onSite.intro}
        </p>
      </div>

      <div className="mt-16 lg:mt-20">
        <RowLabel label={top.label} direction={top.direction} />
        <div className="site-rows mt-5 space-y-3 sm:space-y-4">
          {onSite.rows.map((row) => (
            <PhotoRow key={row.label} row={row} />
          ))}
        </div>
        <div className="mt-5">
          <RowLabel label={bottom.label} direction={bottom.direction} />
        </div>
      </div>
    </section>
  );
}
