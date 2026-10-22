"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { nav } from "@/lib/content";
import { ArrowIcon, Logo } from "./ui";

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function useScrolledPast(offset: number) {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > offset,
    () => false,
  );
}

export function SiteHeader() {
  const scrolled = useScrolledPast(24);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // No backdrop-filter while the menu is open: it would trap the fixed menu inside the header box.
  const surface = open
    ? "border-white/10 bg-ink"
    : scrolled
      ? "border-white/10 bg-ink/90 backdrop-blur-xl"
      : "border-transparent";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${surface}`}
    >
      <div className="shell flex h-18 items-center justify-between">
        <a href="#top" aria-label="Balsoa Consulting home" onClick={() => setOpen(false)}>
          <Logo />
        </a>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.filter((item) => item.href !== "#contact").map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="relative px-4 py-2 text-sm text-white/70 transition-colors after:absolute after:inset-x-4 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-flare after:transition-transform after:duration-500 after:ease-out-expo hover:text-white hover:after:scale-x-100"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="group hidden h-10 items-center gap-2 rounded-full border border-white/15 pl-5 pr-4 text-sm font-medium transition-colors hover:border-flare hover:bg-flare hover:text-ink lg:inline-flex"
          >
            Contact
            <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5" />
          </a>
          <button
            type="button"
            className="relative -mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span
              className={`absolute h-px w-6 bg-white transition-transform duration-500 ease-out-expo ${
                open ? "rotate-45" : "-translate-y-1"
              }`}
            />
            <span
              className={`absolute h-px w-6 bg-white transition-transform duration-500 ease-out-expo ${
                open ? "-rotate-45" : "translate-y-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        inert={!open}
        className={`fixed inset-x-0 top-18 bottom-0 bg-ink transition-[opacity,visibility] duration-500 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav aria-label="Mobile" className="shell flex h-full flex-col justify-between pb-10 pt-8">
          <ul className="space-y-1">
            {[{ label: "Home", href: "#top" }, ...nav].map((item, i) => (
              <li
                key={item.href}
                className={`transition-[opacity,transform] duration-700 ease-out-expo ${
                  open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
                style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
              >
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-4 border-b border-white/10 py-4 text-4xl font-medium tracking-tight"
                >
                  <span className="font-mono text-xs text-flare">0{i}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="label-mono text-steel">Vienna, Austria</p>
        </nav>
      </div>
    </header>
  );
}
