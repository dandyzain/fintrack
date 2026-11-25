"use client";

import { useEffect, useRef } from "react";

type Handler = (e: KeyboardEvent) => void;

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Minimal global shortcuts. Keys: "mod+k", "n", "s", "/".
 * Single-key shortcuts are ignored while typing or when a dialog is open.
 */
export function useHotkeys(map: Record<string, Handler>, enabled = true) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "k" && ref.current["mod+k"]) {
        e.preventDefault();
        ref.current["mod+k"](e);
        return;
      }
      if (mod || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector("[role=dialog][data-state=open], [role=alertdialog]")) return;
      const handler = ref.current[key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
