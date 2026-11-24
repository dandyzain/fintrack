"use client";

import * as React from "react";
import { Receipt, Trash2 } from "lucide-react";
import type { Transaction } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { useAppActions } from "@/context/app-actions-context";
import { localizeCategoryName, localizeTransactionNote, localizeWalletName } from "@/lib/i18n/translations";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { CategoryBubble } from "./category-icon";

interface TransactionRowProps {
  tx: Transaction;
  onDelete?: (tx: Transaction) => void;
  showDate?: boolean;
  dense?: boolean;
}

/**
 * One ledger row. The whole row opens details; quick actions (receipt, delete)
 * sit above it as separate buttons, so there are no nested interactive elements.
 */
export function TransactionRow({ tx, onDelete, showDate = true, dense = false }: TransactionRowProps) {
  const { t, language } = useLanguage();
  const { openDetail, openReceipt } = useAppActions();
  const isIncome = tx.type === "INCOME";
  const title = tx.merchantName || (isIncome ? t.detail.income : t.detail.expense);
  const note = localizeTransactionNote(tx.notes, language);
  const category = tx.category ? localizeCategoryName(tx.category.name, language) : null;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl px-2.5 transition-colors hover:bg-surface-2/70 sm:px-3",
        dense ? "py-2" : "py-2.5"
      )}
    >
      <button
        type="button"
        onClick={() => openDetail(tx.id)}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`${t.transactions.openDetails}: ${title}`}
      />
      <CategoryBubble icon={tx.category?.icon} color={tx.category?.color} income={isIncome} />

      <div className="pointer-events-none relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-fg">{title}</p>
          {tx.receiptImageUrl && (
            <Badge tone="ai" className="hidden px-1.5 py-0 sm:inline-flex">
              <Receipt aria-hidden />
              <span className="sr-only sm:not-sr-only">{t.transactions.receipt}</span>
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-fg-subtle">
          {[
            showDate ? formatDate(tx.date, language, "short") : null,
            category ?? (isIncome ? null : t.transactions.uncategorized),
            localizeWalletName(tx.wallet?.name, language),
            note || null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-1">
        {tx.receiptImageUrl && (
          <Tooltip content={t.transactions.viewReceipt}>
            <button
              type="button"
              onClick={() => openReceipt(tx.receiptImageUrl as string)}
              aria-label={t.transactions.viewReceipt}
              className="grid size-9 place-items-center rounded-lg text-ai-fg transition hover:bg-ai/10 focus-visible:opacity-100 fine:sm:opacity-0 fine:sm:group-hover:opacity-100 coarse:size-10"
            >
              <Receipt className="size-4" aria-hidden />
            </button>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip content={t.common.delete}>
            <button
              type="button"
              onClick={() => onDelete(tx)}
              aria-label={`${t.common.delete}: ${title}`}
              className="grid size-9 place-items-center rounded-lg text-fg-subtle opacity-0 transition hover:bg-negative/10 hover:text-negative-fg focus-visible:opacity-100 group-hover:opacity-100 coarse:hidden"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </Tooltip>
        )}
      </div>

      <Money
        value={tx.amount}
        direction={isIncome ? "in" : "out"}
        tone={isIncome ? "positive" : "neutral"}
        className="pointer-events-none relative shrink-0 text-right text-sm font-semibold"
      />
    </div>
  );
}
