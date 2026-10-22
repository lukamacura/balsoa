import { partners } from "@/lib/content";
import { ValveMark } from "./ui";

export function PartnerMarquee() {
  return (
    <section aria-label="Clients and partners" className="border-y border-white/10 bg-ink">
      <div className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:gap-0">
        <p className="label-mono shell shrink-0 text-steel lg:mx-0 lg:w-auto lg:max-w-none lg:pr-10">
          Delivered for &amp; qualified with
        </p>
        <div className="marquee min-w-0 flex-1 overflow-hidden">
          <div className="marquee-track flex w-max">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 items-center">
                {partners.map((name) => (
                  <li key={name} className="flex items-center whitespace-nowrap text-xl font-medium tracking-tight text-white/45 sm:text-2xl">
                    {name}
                    <ValveMark className="mx-8 h-4 w-4 text-white/20" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
