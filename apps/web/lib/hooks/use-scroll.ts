"use client";

import { useEffect, useState } from "react";

/** Tracks whether the page has scrolled and the last scroll direction (rAF-throttled). */
export function useScrollState(threshold = 8) {
  const [state, setState] = useState({ scrolled: false, direction: "up" as "up" | "down" });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      setState((prev) => {
        const scrolled = y > threshold;
        const direction = Math.abs(delta) < 6 ? prev.direction : delta > 0 && y > 80 ? "down" : "up";
        return prev.scrolled === scrolled && prev.direction === direction ? prev : { scrolled, direction };
      });
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
