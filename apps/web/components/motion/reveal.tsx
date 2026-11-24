"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { riseIn, staggerChildren } from "@/lib/motion";

/** Container that staggers its <RevealItem> children on mount. */
export function Stagger({
  children,
  stagger = 0.05,
  delay = 0,
  className,
  ...props
}: HTMLMotionProps<"div"> & { stagger?: number; delay?: number }) {
  return (
    <motion.div
      variants={staggerChildren(stagger, delay)}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={riseIn} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/** Reveals once when scrolled into view (below-the-fold sections). */
export function InView({ children, className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
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
