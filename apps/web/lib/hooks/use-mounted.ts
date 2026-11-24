"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * false during SSR/hydration, true afterwards. Use it for output that depends
 * on the viewer's clock or locale (greetings, "this month"), so prerendered
 * HTML never mismatches the client.
 */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
