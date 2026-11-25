import { cn } from "@/lib/utils";

/**
 * FinTrack mark: a rounded "F" whose top arm leads to a single dot —
 * the point you're tracking (it echoes the live point on the net-flow line).
 * Inline SVG so it's crisp at any size and costs no image request.
 * Geometry is shared with app/icon.svg and the PNG icons in /public.
 */
export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <g fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 23V9h7.4" />
        <path d="M10 16h5.6" />
      </g>
      <circle cx={21.9} cy={9} r={2.25} fill="currentColor" />
    </svg>
  );
}

export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[28%] bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <LogoGlyph className="size-full" />
    </span>
  );
}

export function BrandLockup({ collapsed = false, tagline }: { collapsed?: boolean; tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={32} />
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block text-base font-bold tracking-tight text-fg">FinTrack</span>
          {tagline && <span className="block truncate text-xs text-fg-subtle">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
