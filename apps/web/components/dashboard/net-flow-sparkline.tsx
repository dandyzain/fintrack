"use client";

import * as React from "react";
import type { DailyExpenseTrend } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { usePrivacy } from "@/context/privacy-context";
import { useMounted } from "@/lib/hooks/use-mounted";
import { fmt } from "@/lib/i18n/translations";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "@/components/ui/money";

const W = 280;
const H = 84;
const PAD_Y = 10;

/** Monotone cubic interpolation (no overshoot below/above real values). */
function monotonePath(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

interface NetFlowSparklineProps {
  trends: DailyExpenseTrend[];
  /** Viewing the current month: stop the line at today instead of flat-lining to month end. */
  isCurrent: boolean;
  delay?: number;
  className?: string;
}

/**
 * Running net cashflow (income − spending) across the month, drawn in on load.
 * Real data only; hover to scrub day by day.
 */
export function NetFlowSparkline({ trends, isCurrent, delay = 300, className }: NetFlowSparklineProps) {
  const { t, language } = useLanguage();
  const { hidden } = usePrivacy();
  const mounted = useMounted(); // "today" depends on the viewer's clock
  const [hover, setHover] = React.useState<number | null>(null);
  const gradId = React.useId().replace(/:/g, "");

  const series = React.useMemo(() => {
    const sorted = [...trends].sort((a, b) => a.day - b.day);
    const today = new Date().getDate();
    const cut = isCurrent ? sorted.filter((d) => d.day <= today) : sorted;
    let run = 0;
    return cut.map((d) => {
      run += (d.incomeAmount || 0) - (d.expenseAmount || 0);
      return { day: d.day, value: run };
    });
  }, [trends, isCurrent]);

  const hasSignal = series.length >= 2 && series.some((p) => p.value !== 0);
  if (!mounted || !hasSignal) {
    // Reserve the space so nothing shifts when the line appears.
    return <div aria-hidden className={cn("h-[7rem]", className)} />;
  }

  const values = series.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => H - PAD_Y - ((v - min) / span) * (H - PAD_Y * 2);
  const pts = series.map((p, i) => ({ x: x(i), y: y(p.value) }));
  const line = monotonePath(pts);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = series[series.length - 1];
  const end = pts[pts.length - 1];
  const positive = last.value >= 0;
  const color = positive ? "rgb(var(--positive))" : "rgb(var(--negative))";
  const zeroY = y(0);
  const active = hover !== null ? series[hover] : null;

  const aria = hidden
    ? t.overview.netFlowAriaHidden
    : fmt(t.overview.netFlowAria, {
        start: formatIDR(series[0].value, { sign: "always", lang: language }),
        end: formatIDR(last.value, { sign: "always", lang: language }),
      });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(rel * (series.length - 1)));
  };

  return (
    <figure className={cn("relative h-[7rem]", className)}>
      <figcaption className="motion-fade flex items-baseline justify-between gap-3" style={{ "--d": `${delay}ms` } as React.CSSProperties}>
        {/* While scrubbing, the caption shows the hovered day instead of a floating tooltip */}
        <span className="text-xs font-medium text-fg-muted">
          {active ? fmt(t.overview.cashflow.day, { day: active.day }) : t.overview.netFlowTitle}
        </span>
        <Money
          value={active ? active.value : last.value}
          sign="always"
          tone={(active ? active.value : last.value) >= 0 ? "positive" : "negative"}
          compact
          className="text-sm font-semibold"
        />
      </figcaption>

      <div className="relative mt-2" role="img" aria-label={aria}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[5.25rem] w-full overflow-visible"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          aria-hidden
        >
          <defs>
            <linearGradient id={`nf-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {min < 0 && max > 0 && (
            <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke="rgb(var(--line-strong))" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          )}

          <path d={area} fill={`url(#nf-${gradId})`} className="motion-fade" style={{ "--d": `${delay + 500}ms` } as React.CSSProperties} />
          <path
            d={line}
            pathLength={1}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="motion-draw"
            style={{ "--d": `${delay}ms` } as React.CSSProperties}
          />

          {active && hover !== null && (
            <line
              x1={pts[hover].x}
              x2={pts[hover].x}
              y1={0}
              y2={H}
              stroke="rgb(var(--fg-subtle))"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Points are HTML so they stay round while the SVG stretches horizontally. */}
        <span
          aria-hidden
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(end.x / W) * 100}%`, top: `${(end.y / H) * 100}%` }}
        >
          <span className="motion-pop absolute inset-0" style={{ "--d": `${delay + 1200}ms` } as React.CSSProperties}>
            <span className="motion-ping absolute inset-0 rounded-full" style={{ backgroundColor: color, "--d": `${delay + 1700}ms` } as React.CSSProperties} />
            <span className="absolute inset-0 rounded-full ring-2 ring-surface-1" style={{ backgroundColor: color }} />
          </span>
        </span>
        {active && hover !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface-1"
            style={{ left: `${(pts[hover].x / W) * 100}%`, top: `${(pts[hover].y / H) * 100}%`, backgroundColor: color }}
          />
        )}

      </div>
    </figure>
  );
}
