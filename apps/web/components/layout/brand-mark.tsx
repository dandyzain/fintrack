import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ size = 32, className, glow = false }: { size?: number; className?: string; glow?: boolean }) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {glow && (
        <span
          aria-hidden
          className="absolute -inset-1 rounded-[30%] bg-gradient-to-br from-brand to-ai opacity-50 blur-md"
        />
      )}
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        priority
        className="relative rounded-[28%] border border-white/15 object-cover shadow-elev-1"
      />
    </span>
  );
}

export function BrandLockup({ collapsed = false, tagline }: { collapsed?: boolean; tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={32} glow />
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block text-base font-bold tracking-tight text-fg">FinTrack</span>
          {tagline && <span className="block truncate text-xs text-fg-subtle">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
