import type { ReactNode, SVGProps } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <ValveMark className="h-7 w-7" />
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-[0.24em]">BALSOA</span>
        <span className="mt-1 block font-mono text-[9px] uppercase leading-none tracking-[0.32em] text-steel">
          Consulting
        </span>
      </span>
    </span>
  );
}

/** Ball valve with actuator, drawn like a P&ID symbol. */
export function ValveMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 11v14l13-7zM29 11v14l-13-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M16 14V5M11.5 5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="18" r="3.6" fill="var(--color-flare)" />
    </svg>
  );
}

export function SectionLabel({
  index,
  children,
  className = "",
}: {
  index: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`label-mono flex items-center gap-3 self-start ${className}`}>
      <span className="text-flare">{index}</span>
      <span className="h-px w-8 bg-current opacity-30" />
      <span>{children}</span>
    </p>
  );
}

/** 3:2 country flag from /public/flags. Decorative: the country name always sits beside it. */
export function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flag inline-block aspect-[3/2] h-3 shrink-0 ${className}`}
      style={{ backgroundImage: `url(/flags/${code}.svg)` }}
    />
  );
}

export function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// pathLength={1} lets CSS redraw each stroke with a normalised dash.
const serviceGlyphs: Record<string, ReactNode> = {
  // Generator: circle with a sine wave
  energy: (
    <>
      <circle cx="24" cy="24" r="15" pathLength={1} />
      <path d="M14.5 24c2.4-6 4.8-6 7.2 0s4.8 6 7.2 0 3.6-4.5 4.6-2" pathLength={1} />
    </>
  ),
  // Ball valve on a pipe run
  engineering: (
    <>
      <path d="M4 24h7M37 24h7M11 15v18l13-9zM37 15v18l-13-9z" pathLength={1} />
      <circle cx="24" cy="24" r="3.5" pathLength={1} />
      <path d="M24 20.5V10M19 10h10" pathLength={1} />
    </>
  ),
  // Network of nodes
  business: (
    <>
      <circle cx="10" cy="34" r="3.5" pathLength={1} />
      <circle cx="24" cy="12" r="3.5" pathLength={1} />
      <circle cx="38" cy="30" r="3.5" pathLength={1} />
      <circle cx="24" cy="26" r="2" pathLength={1} />
      <path d="M12.5 31.5 22 27.5M26 25.8l8.6 3.2M24 15.5V24M13 32.5 21.5 14.8M35 28 26.8 14.6" pathLength={1} />
    </>
  ),
};

export function ServiceGlyph({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {serviceGlyphs[id]}
    </svg>
  );
}
