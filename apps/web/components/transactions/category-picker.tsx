"use client";

import * as React from "react";
import { Check } from "lucide-react";
import type { Category } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { localizeCategoryName } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { CategoryBubble } from "./category-icon";

/** Category chips with radio semantics (arrow keys move, Space/Enter selects). */
export function CategoryPicker({
  categories,
  value,
  onChange,
  label,
  noneLabel,
  aiSuggested = false,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  noneLabel: string;
  aiSuggested?: boolean;
}) {
  const { language } = useLanguage();
  const options = [{ id: "", name: noneLabel, color: "", icon: "" }, ...categories];
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.id === value));

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((c, i) => {
        const active = i === selectedIndex;
        return (
          <button
            key={c.id || "none"}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(c.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl border pl-1.5 pr-3 text-sm font-medium transition coarse:h-11",
              active
                ? cn("border-brand bg-brand/10 text-fg ring-2 ring-brand/20", aiSuggested && c.id && "border-ai bg-ai/10 ring-ai/25")
                : "border-line bg-surface-1 text-fg-muted hover:border-line-strong hover:text-fg",
              !c.id && "pl-3"
            )}
          >
            {c.id ? <CategoryBubble icon={c.icon} color={c.color} size="sm" className="size-7 rounded-lg" /> : null}
            <span className="whitespace-nowrap">{c.id ? localizeCategoryName(c.name, language) : c.name}</span>
            {active && <Check className="size-3.5 text-brand-fg" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
