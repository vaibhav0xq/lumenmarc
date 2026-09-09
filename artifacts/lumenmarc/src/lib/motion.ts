import type { Variants } from "framer-motion";

/* Route change: the leaving page dims, the arriving page settles up by a few pixels. One ease for the whole site. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  },
};
