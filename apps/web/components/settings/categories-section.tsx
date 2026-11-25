"use client";

import * as React from "react";
import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/lib/api/queries";
import { fmt, localizeCategoryName } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { InlineAlert, Skeleton } from "@/components/ui/feedback";
import { Tooltip } from "@/components/ui/tooltip";
import { CategoryBubble, COLOR_CHOICES, ICON_CHOICES, resolveCategoryIcon } from "@/components/transactions/category-icon";

interface Draft {
  name: string;
  icon: string;
  color: string;
}

function CategoryFields({ draft, onChange, idPrefix }: { draft: Draft; onChange: (d: Draft) => void; idPrefix: string }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Field label={t.categories.name}>
        <Input value={draft.name} maxLength={50} onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder={t.categories.namePlaceholder} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg">{t.categories.icon}</legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.categories.icon}>
          {ICON_CHOICES.map((name) => {
            const Icon = resolveCategoryIcon(name);
            const selected = draft.icon === name;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={name}
                id={`${idPrefix}-icon-${name}`}
                onClick={() => onChange({ ...draft, icon: name })}
                className={cn(
                  "grid size-9 place-items-center rounded-lg border transition",
                  selected ? "border-brand bg-brand/10 text-brand-fg" : "border-line text-fg-muted hover:bg-surface-2"
                )}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg">{t.categories.color}</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.categories.color}>
          {COLOR_CHOICES.map((color) => {
            const selected = draft.color.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={color}
                onClick={() => onChange({ ...draft, color })}
                className={cn("grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-surface-1 transition", selected && "ring-2 ring-fg")}
                style={{ backgroundColor: color }}
              >
                {selected && <Check className="size-4 text-white" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

const EMPTY: Draft = { name: "", icon: "Tag", color: COLOR_CHOICES[0] };

export function CategoriesSection({ userId }: { userId: string }) {
  const { t, language } = useLanguage();
  const categories = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<(Draft & { id: string }) | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Category | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return setError(t.categories.nameRequired);
    setError(null);
    try {
      await create.mutateAsync({ ...draft, name: draft.name.trim() });
      toast.success(fmt(t.categories.created, { name: draft.name.trim() }));
      setDraft(EMPTY);
      setAdding(false);
    } catch (err) {
      setError((err as Error).message || t.categories.failed);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) return setError(t.categories.nameRequired);
    setError(null);
    try {
      await update.mutateAsync({ id: editing.id, input: { name: editing.name.trim(), icon: editing.icon, color: editing.color } });
      toast.success(t.categories.updated);
      setEditing(null);
    } catch (err) {
      setError((err as Error).message || t.categories.failed);
    }
  };

  const confirmDelete = async () => {
    const c = pendingDelete;
    setPendingDelete(null);
    if (!c) return;
    try {
      await remove.mutateAsync(c.id);
      toast.success(t.categories.deleted);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Card as="section" id="categories" aria-labelledby="categories-heading" className="scroll-mt-24 p-5 sm:p-6">
      <CardHeader
        id="categories-heading"
        icon={<Tags />}
        title={t.categories.title}
        description={t.categories.subtitle}
        action={
          !adding && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              {t.categories.add}
            </Button>
          )
        }
      />
      <div className="mt-5 space-y-4">
        {error && <InlineAlert>{error}</InlineAlert>}
        {adding && (
          <form onSubmit={add} noValidate className="space-y-4 rounded-2xl border border-line bg-surface-2/40 p-4">
            <CategoryFields draft={draft} onChange={setDraft} idPrefix="new" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" size="sm" loading={create.isPending}>
                {t.categories.create}
              </Button>
            </div>
          </form>
        )}

        {categories.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {(categories.data ?? []).map((c) => {
              const own = c.userId === userId;
              const name = localizeCategoryName(c.name, language);
              if (editing?.id === c.id) {
                return (
                  <li key={c.id} className="p-4">
                    <form onSubmit={save} noValidate className="space-y-4">
                      <CategoryFields draft={editing} onChange={(d) => setEditing({ ...editing, ...d })} idPrefix={c.id} />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                          <X aria-hidden />
                          {t.common.cancel}
                        </Button>
                        <Button type="submit" size="sm" loading={update.isPending}>
                          {t.categories.save}
                        </Button>
                      </div>
                    </form>
                  </li>
                );
              }
              return (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <CategoryBubble icon={c.icon} color={c.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{name}</span>
                  {!own && <Badge>{t.categories.builtIn}</Badge>}
                  {own && (
                    <>
                      <Tooltip content={fmt(t.categories.edit, { name })}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={fmt(t.categories.edit, { name })}
                          onClick={() => setEditing({ id: c.id, name: c.name, icon: c.icon, color: c.color })}
                        >
                          <Pencil aria-hidden />
                        </Button>
                      </Tooltip>
                      <Tooltip content={fmt(t.categories.deleteLabel, { name })}>
                        <Button variant="danger-ghost" size="icon-sm" aria-label={fmt(t.categories.deleteLabel, { name })} onClick={() => setPendingDelete(c)}>
                          <Trash2 aria-hidden />
                        </Button>
                      </Tooltip>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={fmt(t.categories.deleteTitle, { name: localizeCategoryName(pendingDelete?.name, language) })}
        description={t.categories.deleteDesc}
        confirmLabel={t.categories.deleteConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
