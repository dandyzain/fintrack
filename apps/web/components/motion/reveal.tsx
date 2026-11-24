"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { riseIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Staggered entrance for above-the-fold content. Pure CSS (see `.stagger` in
 * globals.css) so it starts on first paint instead of waiting for hydration.
 */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("stagger", className)}>{children}</div>;
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/** Reveals once when scrolled into view (below-the-fold sections). */
export function InView({ children, className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-inview=""
      variants={riseIn}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
