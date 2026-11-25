"use client";

import * as React from "react";
import { ArrowRightLeft, Wallet as WalletIcon } from "lucide-react";
import type { Category, TransactionInput, Wallet } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { localizeWalletName } from "@/lib/i18n/translations";
import { formatIDR, toDateInputValue } from "@/lib/format";
import { Field, Input, Select } from "@/components/ui/field";
import { AmountInput, QuickAmounts } from "@/components/ui/amount-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { InlineAlert } from "@/components/ui/feedback";
import { CategoryPicker } from "./category-picker";

export interface TransactionFormValues {
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number;
  walletId: string;
  /** Destination pocket (TRANSFER only). */
  toWalletId: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
  merchantName: string;
  notes: string;
}

export const LAST_WALLET_KEY = "fintrack-last-wallet";

export function defaultFormValues(wallets: Wallet[]): TransactionFormValues {
  let walletId = wallets[0]?.id ?? "";
  try {
    const last = localStorage.getItem(LAST_WALLET_KEY);
    if (last && wallets.some((w) => w.id === last)) walletId = last;
  } catch {
    /* ignore */
  }
  return {
    type: "EXPENSE",
    amount: 0,
    walletId,
    toWalletId: wallets.find((w) => w.id !== walletId)?.id ?? "",
    categoryId: "",
    date: toDateInputValue(new Date()),
    merchantName: "",
    notes: "",
  };
}

export function toPayload(v: TransactionFormValues): TransactionInput {
  const transfer = v.type === "TRANSFER";
  return {
    walletId: v.walletId,
    toWalletId: transfer ? v.toWalletId || null : null,
    categoryId: transfer ? null : v.categoryId || null,
    amount: Number(v.amount),
    type: v.type,
    date: v.date,
    merchantName: transfer ? null : v.merchantName.trim() || null,
    notes: v.notes.trim() || null,
  };
}

interface TransactionFormProps {
  id: string;
  values: TransactionFormValues;
  onChange: (values: TransactionFormValues) => void;
  onSubmit: () => void;
  wallets: Wallet[];
  categories: Category[];
  error?: string | null;
  fieldErrors?: Partial<Record<"amount" | "walletId" | "toWalletId", string>>;
  autoFocusAmount?: boolean;
}

export function TransactionForm({
  id,
  values,
  onChange,
  onSubmit,
  wallets,
  categories,
  error,
  fieldErrors = {},
  autoFocusAmount = false,
}: TransactionFormProps) {
  const { t, language } = useLanguage();
  const set = <K extends keyof TransactionFormValues>(k: K, v: TransactionFormValues[K]) =>
    onChange({ ...values, [k]: v });
  const transfer = values.type === "TRANSFER";
  const walletOptions = wallets.map((w) => (
    <option key={w.id} value={w.id}>
      {localizeWalletName(w.name, language)} · {formatIDR(w.balance, { lang: language })}
    </option>
  ));

  return (
    <form
      id={id}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      {error && <InlineAlert>{error}</InlineAlert>}

      <SegmentedControl
        block
        label={t.entry.type}
        value={values.type}
        onChange={(v) => set("type", v)}
        options={[
          { value: "EXPENSE", label: t.entry.expense, activeClassName: "!bg-negative/15 ring-1 ring-negative/30" },
          { value: "INCOME", label: t.entry.income, activeClassName: "!bg-positive/15 ring-1 ring-positive/30" },
          ...(wallets.length > 1
            ? [{ value: "TRANSFER" as const, label: t.entry.transfer, activeClassName: "!bg-brand/15 ring-1 ring-brand/30" }]
            : []),
        ]}
      />
      {transfer && <p className="-mt-2 text-xs text-fg-subtle">{t.entry.transferHint}</p>}

      <Field label={t.entry.amount} error={fieldErrors.amount}>
        <AmountInput
          size="lg"
          value={values.amount}
          onValueChange={(v) => set("amount", v)}
          autoFocus={autoFocusAmount}
          required
        />
      </Field>
      <QuickAmounts label={t.entry.quickAdd} onAdd={(a) => set("amount", values.amount + a)} />

      {transfer ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.entry.fromPocket} error={fieldErrors.walletId}>
            <Select value={values.walletId} onChange={(e) => set("walletId", e.target.value)} leadingIcon={<WalletIcon />} required>
              {walletOptions}
            </Select>
          </Field>
          <Field label={t.entry.toPocket} error={fieldErrors.toWalletId}>
            <Select value={values.toWalletId} onChange={(e) => set("toWalletId", e.target.value)} leadingIcon={<ArrowRightLeft />} required>
              {walletOptions}
            </Select>
          </Field>
        </div>
      ) : (
        <Field label={t.entry.pocket} error={fieldErrors.walletId}>
          <Select value={values.walletId} onChange={(e) => set("walletId", e.target.value)} leadingIcon={<WalletIcon />} required>
            {walletOptions}
          </Select>
        </Field>
      )}
      <Field label={t.entry.date}>
        <Input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} required />
      </Field>

      {!transfer && (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-fg">
          {t.entry.category} <span className="font-normal text-fg-subtle">({t.common.optional})</span>
        </legend>
        <CategoryPicker
          categories={categories}
          value={values.categoryId}
          onChange={(v) => set("categoryId", v)}
          label={t.entry.category}
          noneLabel={t.entry.noCategory}
        />
      </fieldset>
      )}

      <div className={transfer ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        {!transfer && (
        <Field label={t.entry.merchant} optional={t.common.optional}>
          <Input
            value={values.merchantName}
            onChange={(e) => set("merchantName", e.target.value)}
            placeholder={t.entry.merchantPlaceholder}
            maxLength={100}
            autoComplete="off"
          />
        </Field>
        )}
        <Field label={t.entry.notes} optional={t.common.optional}>
          <Input
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder={t.entry.notesPlaceholder}
            maxLength={500}
            autoComplete="off"
          />
        </Field>
      </div>
    </form>
  );
}

export function validateForm(
  v: TransactionFormValues,
  t: ReturnType<typeof useLanguage>["t"]
): Partial<Record<"amount" | "walletId" | "toWalletId", string>> {
  const errors: Partial<Record<"amount" | "walletId" | "toWalletId", string>> = {};
  if (!v.walletId) errors.walletId = t.entry.walletRequired;
  if (v.type === "TRANSFER" && (!v.toWalletId || v.toWalletId === v.walletId)) errors.toWalletId = t.entry.toPocketRequired;
  if (!v.amount || v.amount <= 0) errors.amount = t.entry.amountZero;
  return errors;
}
