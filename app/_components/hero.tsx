import { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import { hero } from "@/lib/content";
import { HeroBackdrop, HeroMediaProvider, MotionToggle } from "./hero-media";
import { ArrowIcon, Flag } from "./ui";

const delay = (ms: number) => ({ "--d": ms }) as CSSProperties;

/** First frame of each hero video cut, shown until the video plays (and instead of it for reduced motion). */
function HeroPoster() {
  const common = { alt: "", sizes: "100vw", fetchPriority: "high" } as const;
  const {
    props: { srcSet: portrait },
  } = getImageProps({ ...common, src: "/videos/hero-portrait.jpg", width: 540, height: 720 });
  const {
    props: { srcSet: landscape, ...rest },
  } = getImageProps({ ...common, src: "/videos/hero-landscape.jpg", width: 1280, height: 720 });

  return (
    <picture>
      <source media="(orientation: portrait)" srcSet={portrait} />
      <img {...rest} alt="" srcSet={landscape} className="absolute inset-0 h-full w-full object-cover" />
    </picture>
  );
}

export function Hero() {
  return (
    <HeroMediaProvider>
      <section id="top" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink">
        <HeroBackdrop>
          <HeroPoster />
        </HeroBackdrop>

        <p
          aria-hidden="true"
          className="fade-up label-mono absolute right-5 top-1/2 hidden -translate-y-1/2 text-white/35 [writing-mode:vertical-rl] lg:right-12 lg:block"
          style={delay(1200)}
        >
          48.2082° N · 16.3738° E
        </p>

        <div className="hero-recede shell relative flex flex-1 flex-col justify-end pb-8 pt-32 portrait:pt-[46svh] lg:pb-12">
          <p className="fade-up label-mono flex items-center gap-3 text-white/70" style={delay(100)}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-flare opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-flare" />
            </span>
            {hero.eyebrow}
          </p>

          <h1 className="hero-text mt-6 max-w-[16ch] text-[clamp(2.6rem,6.4vw,6.75rem)] font-medium leading-[0.95] tracking-[-0.04em] sm:max-w-none">
            {hero.lines.map((line, i) => (
              <span key={line} className="line-mask">
                <span className={i === hero.lines.length - 1 ? "text-steel" : undefined} style={delay(200 + i * 110)}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="hero-text fade-up max-w-xl text-base leading-relaxed text-white/75 sm:text-lg" style={delay(650)}>
                {hero.lead}
              </p>
              <div className="fade-up mt-8 flex flex-wrap items-center gap-3" style={delay(800)}>
                <a
                  href="#contact"
                  className="group inline-flex h-12 items-center gap-3 rounded-full bg-flare pl-6 pr-5 text-sm font-medium text-ink transition-colors hover:bg-white"
                >
                  Start a project
                  <ArrowIcon className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
                </a>
                <a
                  href="#services"
                  className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition-colors hover:border-white hover:bg-white/5"
                >
                  Explore services
                </a>
              </div>
            </div>
            <MotionToggle />
          </div>

          <dl className="mt-14 grid grid-cols-2 border-t border-white/12 lg:grid-cols-4">
            {hero.stats.map((stat, i) => (
              <div
                key={stat.label}
                className="fade-up flex flex-col-reverse gap-2 border-white/10 py-5 pr-4 max-lg:even:border-l max-lg:even:pl-5 lg:border-l lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
                style={delay(950 + i * 90)}
              >
                <dt className="text-sm text-white/50">
                  {stat.flags && (
                    <span className="mb-2.5 flex -space-x-1.5">
                      {stat.flags.map((code) => (
                        <Flag key={code} code={code} className="size-3.5 rounded-full! ring-2 ring-ink sm:size-4" />
                      ))}
                    </span>
                  )}
                  {stat.label}
                </dt>
                <dd className="flex items-baseline gap-2">
                  <span className="text-3xl font-medium tracking-tight sm:text-4xl">{stat.value}</span>
                  <span className="label-mono text-flare">{stat.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </HeroMediaProvider>
  );
}
