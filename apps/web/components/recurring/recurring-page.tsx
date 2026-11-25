"use client";

import * as React from "react";
import { ArrowRightLeft, Pause, Play, Plus, Repeat, Trash2, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";
import { useCategories, useCreateRecurring, useDeleteRecurring, useRecurring, useUpdateRecurring, useWallets } from "@/lib/api/queries";
import type { Category, Frequency, RecurringRule, TransactionType, Wallet } from "@/lib/api/client";
import { fmt, localizeCategoryName, localizeWalletName, type TranslationSchema } from "@/lib/i18n/translations";
import { formatDate, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { AmountInput } from "@/components/ui/amount-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { EmptyState, InlineAlert, Skeleton } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { Tooltip } from "@/components/ui/tooltip";
import { CategoryBubble } from "@/components/transactions/category-icon";
import { CategoryPicker } from "@/components/transactions/category-picker";

export function frequencyLabel(t: TranslationSchema, frequency: Frequency, interval: number): string {
  if (interval <= 1) {
    return { DAILY: t.recurringPage.freqDaily, WEEKLY: t.recurringPage.freqWeekly, MONTHLY: t.recurringPage.freqMonthly, YEARLY: t.recurringPage.freqYearly }[frequency];
  }
  const tpl = { DAILY: t.recurringPage.everyDays, WEEKLY: t.recurringPage.everyWeeks, MONTHLY: t.recurringPage.everyMonths, YEARLY: t.recurringPage.everyYears }[frequency];
  return fmt(tpl, { n: interval });
}

export function RecurringPage() {
  const { t, language } = useLanguage();
  const rules = useRecurring();
  const wallets = useWallets();
  const categories = useCategories();
  const update = useUpdateRecurring();
  const remove = useDeleteRecurring();
  const [creating, setCreating] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<RecurringRule | null>(null);

  const walletName = (id: string | null) => localizeWalletName((wallets.data ?? []).find((w) => w.id === id)?.name, language);
  const categoryOf = (id: string | null) => (categories.data ?? []).find((c) => c.id === id) ?? null;

  const toggle = async (rule: RecurringRule) => {
    try {
      await update.mutateAsync({ id: rule.id, input: { active: !rule.active } });
      toast.success(t.recurringPage.updated);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmDelete = async () => {
    const rule = pendingDelete;
    setPendingDelete(null);
    if (!rule) return;
    try {
      await remove.mutateAsync(rule.id);
      toast.success(t.recurringPage.deleted);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5 pb-4 pt-2 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.recurringPage.title}</h1>
          <p className="mt-1 text-sm text-fg-subtle sm:text-base">{t.recurringPage.subtitle}</p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!wallets.data?.length}>
          <Plus aria-hidden />
          {t.recurringPage.new}
        </Button>
      </div>

      <Card className="p-2 sm:p-3">
        {rules.isPending ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !rules.data?.length ? (
          <EmptyState
            className="m-2"
            icon={<Repeat />}
            title={t.recurringPage.empty}
            description={t.recurringPage.emptyDesc}
            action={
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus aria-hidden />
                {t.recurringPage.new}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rules.data.map((rule) => {
              const category = categoryOf(rule.categoryId);
              const transfer = rule.type === "TRANSFER";
              const title =
                rule.merchantName ||
                (category ? localizeCategoryName(category.name, language) : transfer ? t.transactions.transfer : rule.type === "INCOME" ? t.detail.income : t.detail.expense);
              const ended = !rule.active && rule.endDate !== null && new Date(rule.nextRunAt) > new Date(rule.endDate);
              return (
                <li key={rule.id} className={cn("flex flex-wrap items-center gap-3 px-2 py-3 sm:px-3", !rule.active && "opacity-70")}>
                  <CategoryBubble icon={category?.icon} color={category?.color} income={rule.type === "INCOME"} transfer={transfer} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-fg">{title}</p>
                      <Badge tone={rule.active ? "positive" : "neutral"}>
                        {ended ? t.recurringPage.ended : rule.active ? t.recurringPage.active : t.recurringPage.paused}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-subtle">
                      {[
                        frequencyLabel(t, rule.frequency, rule.interval),
                        transfer
                          ? fmt(t.transactions.transferBetween, { from: walletName(rule.walletId), to: walletName(rule.toWalletId) })
                          : walletName(rule.walletId),
                        rule.active ? fmt(t.recurringPage.nextRun, { date: formatDate(rule.nextRunAt, language, "short") }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Money
                    value={rule.amount}
                    direction={transfer ? undefined : rule.type === "INCOME" ? "in" : "out"}
                    tone={rule.type === "INCOME" ? "positive" : "neutral"}
                    className="text-sm font-semibold"
                  />
                  <div className="flex items-center gap-1">
                    {!ended && (
                      <Tooltip content={rule.active ? t.recurringPage.pause : t.recurringPage.resume}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggle(rule)}
                          loading={update.isPending && update.variables?.id === rule.id}
                          aria-label={`${rule.active ? t.recurringPage.pause : t.recurringPage.resume}: ${title}`}
                        >
                          {!(update.isPending && update.variables?.id === rule.id) && (rule.active ? <Pause aria-hidden /> : <Play aria-hidden />)}
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content={t.recurringPage.delete}>
                      <Button variant="danger-ghost" size="icon" onClick={() => setPendingDelete(rule)} aria-label={`${t.recurringPage.delete}: ${title}`}>
                        <Trash2 aria-hidden />
                      </Button>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <NewRecurringModal
        open={creating}
        onOpenChange={setCreating}
        wallets={wallets.data ?? []}
        categories={categories.data ?? []}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t.recurringPage.deleteTitle}
        description={t.recurringPage.deleteDesc}
        confirmLabel={t.recurringPage.deleteConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

interface FormState {
  type: TransactionType;
  amount: number;
  walletId: string;
  toWalletId: string;
  categoryId: string;
  merchantName: string;
  notes: string;
  frequency: Frequency;
  interval: number;
  startDate: string;
  endDate: string;
}

function initialForm(wallets: Wallet[]): FormState {
  return {
    type: "EXPENSE",
    amount: 0,
    walletId: wallets[0]?.id ?? "",
    toWalletId: wallets[1]?.id ?? "",
    categoryId: "",
    merchantName: "",
    notes: "",
    frequency: "MONTHLY",
    interval: 1,
    startDate: toDateInputValue(new Date()),
    endDate: "",
  };
}

function NewRecurringModal({
  open,
  onOpenChange,
  wallets,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  wallets: Wallet[];
  categories: Category[];
}) {
  const { t, language } = useLanguage();
  const create = useCreateRecurring();
  const [v, setV] = React.useState<FormState>(() => initialForm(wallets));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setV(initialForm(wallets));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(k: K, value: FormState[K]) => setV((s) => ({ ...s, [k]: value }));
  const transfer = v.type === "TRANSFER";
  const walletOptions = wallets.map((w) => (
    <option key={w.id} value={w.id}>
      {localizeWalletName(w.name, language)}
    </option>
  ));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount || v.amount <= 0) return setError(t.entry.amountZero);
    if (!v.walletId) return setError(t.entry.walletRequired);
    if (transfer && (!v.toWalletId || v.toWalletId === v.walletId)) return setError(t.entry.toPocketRequired);
    setError(null);
    try {
      const res = await create.mutateAsync({
        type: v.type,
        amount: v.amount,
        walletId: v.walletId,
        toWalletId: transfer ? v.toWalletId : null,
        categoryId: transfer ? null : v.categoryId || null,
        merchantName: transfer ? null : v.merchantName.trim() || null,
        notes: v.notes.trim() || null,
        frequency: v.frequency,
        interval: Math.max(1, Math.round(v.interval)),
        startDate: v.startDate,
        endDate: v.endDate || null,
      });
      toast.success(
        res.createdTransactions > 0 ? fmt(t.recurringPage.createdWithBackfill, { count: res.createdTransactions }) : t.recurringPage.created
      );
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || t.recurringPage.failed);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t.recurringPage.newTitle}
      description={t.recurringPage.newSubtitle}
      icon={<Repeat className="text-brand-fg" />}
      closeLabel={t.common.close}
      size="lg"
      dismissible={!create.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="recurring-form" loading={create.isPending}>
            {create.isPending ? t.recurringPage.saving : t.recurringPage.save}
          </Button>
        </>
      }
    >
      <form id="recurring-form" onSubmit={submit} noValidate className="space-y-5">
        {error && <InlineAlert>{error}</InlineAlert>}
        <SegmentedControl
          block
          label={t.entry.type}
          value={v.type}
          onChange={(type) => set("type", type)}
          options={[
            { value: "EXPENSE", label: t.entry.expense, activeClassName: "!bg-negative/15 ring-1 ring-negative/30" },
            { value: "INCOME", label: t.entry.income, activeClassName: "!bg-positive/15 ring-1 ring-positive/30" },
            ...(wallets.length > 1 ? [{ value: "TRANSFER" as const, label: t.entry.transfer, activeClassName: "!bg-brand/15 ring-1 ring-brand/30" }] : []),
          ]}
        />
        <Field label={t.entry.amount}>
          <AmountInput size="lg" value={v.amount} onValueChange={(a) => set("amount", a)} autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={transfer ? t.entry.fromPocket : t.entry.pocket}>
            <Select value={v.walletId} onChange={(e) => set("walletId", e.target.value)} leadingIcon={<WalletIcon />}>
              {walletOptions}
            </Select>
          </Field>
          {transfer ? (
            <Field label={t.entry.toPocket}>
              <Select value={v.toWalletId} onChange={(e) => set("toWalletId", e.target.value)} leadingIcon={<ArrowRightLeft />}>
                {walletOptions}
              </Select>
            </Field>
          ) : (
            <Field label={t.entry.merchant} optional={t.common.optional}>
              <Input value={v.merchantName} onChange={(e) => set("merchantName", e.target.value)} placeholder={t.entry.merchantPlaceholder} maxLength={100} />
            </Field>
          )}
        </div>

        {!transfer && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-fg">
              {t.entry.category} <span className="font-normal text-fg-subtle">({t.common.optional})</span>
            </legend>
            <CategoryPicker categories={categories} value={v.categoryId} onChange={(c) => set("categoryId", c)} label={t.entry.category} noneLabel={t.entry.noCategory} />
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label={t.recurringPage.frequency}>
            <Select value={v.frequency} onChange={(e) => set("frequency", e.target.value as Frequency)}>
              <option value="DAILY">{t.recurringPage.freqDaily}</option>
              <option value="WEEKLY">{t.recurringPage.freqWeekly}</option>
              <option value="MONTHLY">{t.recurringPage.freqMonthly}</option>
              <option value="YEARLY">{t.recurringPage.freqYearly}</option>
            </Select>
          </Field>
          <Field label={t.recurringPage.interval}>
            <Input
              type="number"
              min={1}
              max={365}
              inputMode="numeric"
              value={v.interval}
              onChange={(e) => set("interval", Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-fg-subtle">{frequencyLabel(t, v.frequency, v.interval)}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.recurringPage.startDate} hint={t.recurringPage.backfillHint}>
            <Input type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} required />
          </Field>
          <Field label={t.recurringPage.endDate} optional={t.common.optional} hint={!v.endDate ? t.recurringPage.endNever : undefined}>
            <Input type="date" value={v.endDate} min={v.startDate} onChange={(e) => set("endDate", e.target.value)} />
          </Field>
        </div>

        <Field label={t.entry.notes} optional={t.common.optional}>
          <Input value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t.entry.notesPlaceholder} maxLength={500} />
        </Field>
      </form>
    </ResponsiveModal>
  );
}
