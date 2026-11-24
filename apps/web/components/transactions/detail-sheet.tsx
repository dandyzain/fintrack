"use client";

import * as React from "react";
import { CalendarDays, Expand, FileText, Pencil, Receipt, ScanLine, Store, Tag, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";
import { useAppActions } from "@/context/app-actions-context";
import {
  useCategories,
  useDeleteTransactionWithUndo,
  useTransaction,
  useUpdateTransaction,
  useWallets,
} from "@/lib/api/queries";
import { localizeCategoryName, localizeTransactionNote, localizeWalletName } from "@/lib/i18n/translations";
import { formatDate, toDateInputValue, toNumber } from "@/lib/format";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { CategoryBubble } from "./category-icon";
import { TransactionForm, toPayload, validateForm, type TransactionFormValues } from "./transaction-form";

export function DetailSheet({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, language } = useLanguage();
  const { openReceipt } = useAppActions();
  const tx = useTransaction(open ? id : null);
  const wallets = useWallets();
  const categories = useCategories();
  const update = useUpdateTransaction();
  const deleteTx = useDeleteTransactionWithUndo();
  const [editing, setEditing] = React.useState(false);
  const [values, setValues] = React.useState<TransactionFormValues | null>(null);
  const [errors, setErrors] = React.useState<ReturnType<typeof validateForm>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setEditing(false);
      setError(null);
      setErrors({});
      setImgFailed(false);
    }
  }, [open]);

  const d = tx.data;
  const isIncome = d?.type === "INCOME";

  const startEdit = () => {
    if (!d) return;
    setValues({
      type: d.type,
      amount: toNumber(d.amount),
      walletId: d.walletId,
      categoryId: d.categoryId ?? "",
      date: toDateInputValue(new Date(d.date)),
      merchantName: d.merchantName ?? "",
      notes: d.notes ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    if (!d || !values) return;
    const errs = validateForm(values, t);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    try {
      // Items are omitted so the server keeps the existing line items untouched.
      const input = toPayload(values);
      // Keep the original timestamp when the day wasn't changed.
      if (values.date === toDateInputValue(new Date(d.date))) input.date = d.date;
      await update.mutateAsync({ id: d.id, input });
      toast.success(t.detail.updated);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message || t.detail.updateFailed);
    }
  };

  const remove = () => {
    if (!d) return;
    deleteTx(d, () => onOpenChange(false));
  };

  const info = d
    ? [
        { icon: CalendarDays, label: t.detail.date, value: formatDate(d.date, language, "weekday") },
        { icon: Wallet, label: t.detail.pocket, value: localizeWalletName(d.wallet?.name, language) },
        {
          icon: Tag,
          label: t.detail.category,
          value: d.category ? localizeCategoryName(d.category.name, language) : t.transactions.uncategorized,
        },
        ...(d.notes ? [{ icon: FileText, label: t.detail.notes, value: localizeTransactionNote(d.notes, language) }] : []),
      ]
    : [];

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      title={editing ? t.detail.editTitle : t.detail.title}
      icon={<Receipt className="text-brand-fg" />}
      closeLabel={t.common.close}
      dismissible={!update.isPending}
      footer={
        d &&
        (editing ? (
          <>
            <Button key="cancel-edit" variant="ghost" onClick={() => setEditing(false)} disabled={update.isPending}>
              {t.common.cancel}
            </Button>
            <Button key="save-edit" type="submit" form="edit-form" loading={update.isPending}>
              {t.detail.saveChanges}
            </Button>
          </>
        ) : (
          <>
            <Button key="delete" variant="danger-ghost" onClick={remove}>
              <Trash2 aria-hidden />
              {t.common.delete}
            </Button>
            <Button key="start-edit" onClick={startEdit}>
              <Pencil aria-hidden />
              {t.common.edit}
            </Button>
          </>
        ))
      }
    >
      {tx.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : tx.isError || !d ? (
        <EmptyState icon={<Receipt />} title={t.detail.notFound} />
      ) : editing && values ? (
        <TransactionForm
          id="edit-form"
          values={values}
          onChange={setValues}
          onSubmit={save}
          wallets={wallets.data ?? []}
          categories={categories.data ?? []}
          error={error}
          fieldErrors={errors}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <CategoryBubble icon={d.category?.icon} color={d.category?.color} income={isIncome} className="size-12 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={isIncome ? "positive" : "negative"}>{isIncome ? t.detail.income : t.detail.expense}</Badge>
                {d.receiptImageUrl && (
                  <Badge tone="ai">
                    <ScanLine aria-hidden />
                    {t.detail.scannedByAi}
                  </Badge>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 truncate text-base font-semibold text-fg">
                <Store className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                {d.merchantName || (isIncome ? t.detail.income : t.detail.expense)}
              </p>
              <Money
                value={d.amount}
                direction={isIncome ? "in" : "out"}
                tone={isIncome ? "positive" : "neutral"}
                className="mt-1 text-3xl font-bold tracking-tight"
              />
            </div>
          </div>

          <dl className="divide-y divide-line rounded-2xl border border-line">
            {info.map((row) => (
              <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                <row.icon className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                <dt className="w-24 shrink-0 text-sm text-fg-subtle">{row.label}</dt>
                <dd className="min-w-0 flex-1 text-sm font-medium text-fg">{row.value}</dd>
              </div>
            ))}
          </dl>

          {d.receiptImageUrl && !imgFailed && (
            <section aria-label={t.detail.receipt}>
              <h3 className="mb-2 text-sm font-semibold text-fg">{t.detail.receipt}</h3>
              <button
                type="button"
                onClick={() => openReceipt(d.receiptImageUrl as string)}
                className="group relative block w-full overflow-hidden rounded-2xl border border-line"
                aria-label={t.detail.enlarge}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.receiptImageUrl}
                  alt=""
                  onError={() => setImgFailed(true)}
                  className="h-48 w-full object-cover transition-transform duration-slower ease-emphasized group-hover:scale-[1.03]"
                />
                <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-xl bg-black/50 text-white backdrop-blur">
                  <Expand className="size-4" aria-hidden />
                </span>
              </button>
            </section>
          )}

          <section aria-labelledby="items-heading">
            <h3 id="items-heading" className="mb-2 text-sm font-semibold text-fg">
              {t.detail.items}
            </h3>
            {d.items && d.items.length > 0 ? (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {d.items.map((it, i) => (
                  <li key={it.id ?? i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-fg">
                      <span className="tabular mr-2 text-fg-subtle">{it.quantity}×</span>
                      {it.name}
                    </span>
                    <Money value={toNumber(it.price) * (it.quantity || 1)} className="shrink-0 font-medium text-fg" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-fg-subtle">{t.detail.noItems}</p>
            )}
          </section>
        </div>
      )}
    </ResponsiveModal>
  );
}
