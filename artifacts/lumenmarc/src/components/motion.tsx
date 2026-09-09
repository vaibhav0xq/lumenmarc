import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * The site's motion vocabulary. Three primitives, used everywhere so every page moves the same way:
 *
 *   Reveal: a block settles into place once as it scrolls into view (one soft rise, no cascades)
 *   Figure: a live number that glides to its new value when the block changes (never counts up from zero)
 *   Tick: a short label that swaps by sliding one line, the way a mechanical counter turns
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Extra delay in seconds, for a figure that should follow its heading. Keep it under 0.2 s. */
  delay?: number;
  /** Rise distance in px. */
  y?: number;
  as?: "div" | "section" | "li" | "p" | "header" | "figure" | "span";
  once?: boolean;
  amount?: number;
};

export function Reveal({ children, className, delay = 0, y = 14, as = "div", once = true, amount = 0.25 }: RevealProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as] as ElementType;
  if (reduced) return <Tag className={className}>{children}</Tag>;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </Tag>
  );
}

type FigureProps = {
  value: number | null | undefined;
  format: (v: number) => string;
  /** Shown when there is no value. */
  empty?: string;
  className?: string;
  /** Spring feel; the default glides in about half a second. */
  stiffness?: number;
  damping?: number;
  "data-testid"?: string;
};

export function Figure({ value, format, empty = "no reading", className, stiffness = 110, damping = 22, ...rest }: FigureProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const first = useRef(true);
  const spring = useSpring(value ?? 0, { stiffness, damping, mass: 0.8 });

  useMotionValueEvent(spring, "change", (v) => {
    if (ref.current && value != null) ref.current.textContent = format(v);
  });

  useEffect(() => {
    if (value == null) return;
    if (first.current || reduced) {
      first.current = false;
      spring.jump(value);
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    /* A change of more than a quarter is a different reading (token switch, repriced pool), not a movement: show it at once. */
    const prev = spring.get();
    if (Math.abs(value - prev) > Math.max(1e-9, Math.abs(prev)) * 0.25) {
      spring.jump(value);
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    spring.set(value);
  }, [value, reduced, spring, format]);

  return (
    <span ref={ref} className={cn("tnum", className)} {...rest}>
      {value == null ? empty : format(value)}
    </span>
  );
}

type TickProps = {
  /** The text to show; a change in this string turns the counter. */
  text: string;
  className?: string;
  as?: "span" | "div";
};

export function Tick({ text, className, as = "span" }: TickProps) {
  const reduced = useReducedMotion();
  const Tag = as;
  return (
    <Tag className={cn("relative inline-grid overflow-hidden align-baseline", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={text}
          className="col-start-1 row-start-1 block whitespace-nowrap"
          initial={reduced ? false : { y: "0.9em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: "-0.9em", opacity: 0 }}
          transition={{ duration: 0.42, ease: EASE_OUT }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </Tag>
  );
}

/** Arrow that leans forward on hover of the parent `group`. */
export function Arrow({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block transition-transform duration-300 ease-out group-hover:translate-x-[3px]", className)} aria-hidden>
      →
    </span>
  );
}
