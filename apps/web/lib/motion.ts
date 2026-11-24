import type { Transition, Variants } from "framer-motion";

/** Motion tokens — mirror the CSS custom properties in app/globals.css. */
export const duration = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  slower: 0.5,
} as const;

export const ease = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
};

export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 34, mass: 0.8 } satisfies Transition,
  gentle: { type: "spring", stiffness: 220, damping: 26 } satisfies Transition,
  tilt: { type: "spring", stiffness: 260, damping: 22, mass: 0.6 } satisfies Transition,
};

/** Fade + 8px rise used for cards entering the page. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slower, ease: ease.emphasized } },
};

export const staggerChildren = (stagger = 0.04, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});
