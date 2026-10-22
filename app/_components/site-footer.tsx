import { contact, hero, nav } from "@/lib/content";
import { Logo } from "./ui";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink">
      <div className="shell pt-20">
        <div className="grid gap-12 border-b border-white/10 pb-16 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Logo />
            <p className="mt-6 max-w-sm text-white/55">{hero.lines.join(" ").replace(/\.$/, "")}</p>
          </div>
          <nav aria-label="Footer" className="lg:col-span-3">
            <p className="label-mono text-steel">Navigate</p>
            <ul className="mt-5 space-y-3">
              {[{ label: "Home", href: "#top" }, ...nav].map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-white/75 transition-colors hover:text-flare">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="lg:col-span-3">
            <p className="label-mono text-steel">Contact</p>
            <ul className="mt-5 space-y-3 text-white/75">
              <li>{contact.location}</li>
              <li>
                <a href={`mailto:${contact.email}`} className="transition-colors hover:text-flare">
                  {contact.email}
                </a>
              </li>
              <li>
                <a href={contact.webUrl} className="transition-colors hover:text-flare">
                  {contact.web}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-8 text-sm text-white/40 sm:flex-row sm:justify-between">
          <p>© Copyright Balsoa Consulting. All rights reserved.</p>
          <p>Designed by Macura Design.</p>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none -mb-[0.22em] select-none bg-linear-to-b from-white/[0.09] to-transparent bg-clip-text text-center text-[24vw] font-semibold leading-[0.8] tracking-[-0.06em] text-transparent"
      >
        BALSOA
      </p>
    </footer>
  );
}
