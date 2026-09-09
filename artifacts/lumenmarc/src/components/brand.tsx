import { Link } from "wouter";
import { cn } from "@/lib/utils";

/**
 * The mark is the instrument itself: an ivory ring with the zero tick at the top, the fair band
 * either side of it and the blue needle standing off the reference. It is drawn in the current
 * text colour so it sits in the header, the footer and the menu without a plate behind it.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="10.4" fill="none" stroke="currentColor" strokeOpacity="0.92" strokeWidth="1.15" />
      <circle cx="12" cy="12" r="8.9" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.8" />
      {/* zero tick and the two fair-band marks */}
      <line x1="12" y1="1.6" x2="12" y2="4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
      <line x1="6.8" y1="3" x2="7.9" y2="4.9" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" />
      <line x1="17.2" y1="3" x2="16.1" y2="4.9" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" />
      {/* needle, standing off the reference */}
      <g transform="rotate(42 12 12)">
        <polygon points="11.05,12 12,3.1 12.95,12" fill="#4C7DFF" />
        <polygon points="11.3,12 12,15.1 12.7,12" fill="#4C7DFF" fillOpacity="0.78" />
      </g>
      <circle cx="12" cy="12" r="1.9" fill="#0A0C10" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1" />
      <circle cx="12" cy="12" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({
  size = "md",
  asLink = true,
  className,
}: {
  size?: "sm" | "md";
  asLink?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <LogoMark size={size === "sm" ? 18 : 22} className="text-foreground" />
      <span
        className={cn(
          "font-display font-medium leading-none tracking-[-0.018em] text-foreground",
          size === "sm" ? "text-[17px]" : "text-[22px]",
        )}
      >
        LumenMarc
      </span>
    </>
  );
  const cls = cn("group/mark inline-flex items-center", size === "sm" ? "gap-2" : "gap-2.5", className);
  return asLink ? (
    <Link href="/" className={cls} aria-label="LumenMarc home">
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}
