"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatIDR, toNumber, type MoneyOptions } from "@/lib/format";
import { usePrivacy } from "@/context/privacy-context";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useLanguage } from "@/context/language-context";

type Tone = "auto" | "positive" | "negative" | "neutral" | "inherit";

interface MoneyProps extends Omit<MoneyOptions, "lang"> {
  value: unknown;
  tone?: Tone;
  className?: string;
  /** Count up from 0 when first scrolled into view. */
  animateOnView?: boolean;
  /** Treat as expense/income for sign + color (amounts from the API are always positive). */
  direction?: "in" | "out";
  /**
   * Cascade the real digits in on first paint (CSS, no placeholder numbers).
   * Value is the base delay in ms.
   */
  revealDelay?: number;
}

const toneClass: Record<Exclude<Tone, "auto">, string> = {
  positive: "text-positive-fg",
  negative: "text-negative-fg",
  neutral: "text-fg",
  inherit: "",
};

export function Money({
  value,
  tone = "inherit",
  className,
  animateOnView = false,
  direction,
  sign,
  compact,
  revealDelay,
}: MoneyProps) {
  const { hidden } = usePrivacy();
  const { language, t } = useLanguage();
  const raw = toNumber(value);
  const signed = direction === "out" ? -Math.abs(raw) : direction === "in" ? Math.abs(raw) : raw;
  const resolvedTone: Exclude<Tone, "auto"> =
    tone === "auto" ? (signed < 0 ? "negative" : signed > 0 ? "positive" : "neutral") : tone;
  const resolvedSign = sign ?? (direction ? "always" : "auto");

  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const countFrom = (v: number) => {
    const abs = Math.abs(Math.round(v));
    if (abs < 10) return v;
    const floor = 10 ** (String(abs).length - 1);
    return Math.sign(v) * floor;
  };
  // Values that arrive in server HTML show their real amount immediately (a
  // finance app must never flash a placeholder number); only values that load
  // on the client count up. Later changes animate from the previous value.
  const mounted = useMounted();
  const mountedAtFirstRender = React.useRef(mounted).current;
  const countUp = animateOnView && !reduce && mountedAtFirstRender;
  const [display, setDisplay] = React.useState(countUp ? countFrom(signed) : signed);
  const lastShown = React.useRef<number | null>(countUp ? null : signed);

  React.useEffect(() => {
    if (!animateOnView || reduce) {
      lastShown.current = signed;
      setDisplay(signed);
      return;
    }
    if (!inView || lastShown.current === signed) return;
    const from = lastShown.current ?? countFrom(signed);
    const controls = animate(from, signed, {
      duration: lastShown.current === null ? 1.1 : 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        lastShown.current = v;
        setDisplay(v);
      },
      onComplete: () => {
        lastShown.current = signed;
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signed, inView, animateOnView, reduce]);

  const text = formatIDR(display, { sign: resolvedSign, compact, lang: language });
  const finalText = formatIDR(signed, { sign: resolvedSign, compact, lang: language });

  return (
    <span
      ref={ref}
      className={cn(
        "tabular inline-block transition-[filter] duration-slow ease-standard",
        toneClass[resolvedTone],
        hidden && "select-none blur-[7px]",
        className
      )}
    >
      {revealDelay === undefined ? (
        <span aria-hidden>{text}</span>
      ) : (
        <span aria-hidden className="inline-block [perspective:600px]">
          {Array.from(text).map((ch, i) => (
            <span
              key={i}
              className="motion-digit"
              style={{ "--d": `${revealDelay + i * 28}ms` } as React.CSSProperties}
            >
              {ch}
            </span>
          ))}
        </span>
      )}
      <span className="sr-only">{hidden ? t.common.hiddenAmount : finalText}</span>
    </span>
  );
}
