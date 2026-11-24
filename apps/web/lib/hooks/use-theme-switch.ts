"use client";

import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";

type ThemeChoice = "light" | "dark" | "system";

/**
 * Theme change with a circular reveal from the trigger (View Transitions API).
 * Falls back to an instant switch when unsupported or reduced motion is on.
 */
export function useThemeSwitch() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const switchTheme = useCallback(
    (next: ThemeChoice, origin?: { x: number; y: number }) => {
      const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nextResolved =
        next === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;

      if (!doc.startViewTransition || reduce || nextResolved === resolvedTheme) {
        setTheme(next);
        return;
      }

      const x = origin?.x ?? window.innerWidth - 40;
      const y = origin?.y ?? 40;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      const transition = doc.startViewTransition(() => {
        flushSync(() => setTheme(next));
        // Apply synchronously so the snapshot captures the new theme.
        document.documentElement.classList.toggle("dark", nextResolved === "dark");
        document.documentElement.style.colorScheme = nextResolved;
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      });
    },
    [resolvedTheme, setTheme]
  );

  return { theme: (theme as ThemeChoice) ?? "system", resolvedTheme, switchTheme };
}
