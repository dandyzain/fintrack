"use client";

import * as React from "react";

/**
 * Renders `fallback` until the placeholder scrolls near the viewport, then
 * mounts `children`. Keeps heavy below-the-fold widgets (charts) off the
 * critical path.
 */
export function LazyMount({
  children,
  fallback,
  rootMargin = "200px",
  className,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  rootMargin?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  );
}
