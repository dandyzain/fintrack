"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Plus, Trash2, Wallet as WalletIcon, X } from "lucide-react";
import { toast } from "sonner";
import type { Wallet, WalletDeleteOption } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { useCreateWallet, useDeleteWallet, useUpdateWallet, useWallets } from "@/lib/api/queries";
import { fmt, localizeWalletName } from "@/lib/i18n/translations";
import { toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { AmountInput } from "@/components/ui/amount-input";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Money } from "@/components/ui/money";
import { InlineAlert, Skeleton } from "@/components/ui/feedback";
import { Tooltip } from "@/components/ui/tooltip";

type DeleteChoice = "move" | "delete-all";

export function WalletsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, language } = useLanguage();
  const wallets = useWallets();
  const create = useCreateWallet();
  const update = useUpdateWallet();
  const del = useDeleteWallet();
  const [name, setName] = React.useState("");
  const [balance, setBalance] = React.useState(0);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ id: string; name: string; balance: number } | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Wallet | null>(null);
  const [choice, setChoice] = React.useState<DeleteChoice>("move");
  const [targetId, setTargetId] = React.useState("");
  const nameRef = React.useRef<HTMLInputElement>(null);
  const list = wallets.data ?? [];

  React.useEffect(() => {
    if (!open) {
      setName("");
      setBalance(0);
      setNameError(null);
      setError(null);
      setEditing(null);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(t.wallets.nameRequired);
      nameRef.current?.focus();
      return;
    }
    setNameError(null);
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), balance });
      toast.success(fmt(t.wallets.created, { name: name.trim() }));
      setName("");
      setBalance(0);
    } catch (err) {
      setError((err as Error).message || t.wallets.createFailed);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) {
      setError(t.wallets.nameRequired);
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({ id: editing.id, input: { name: editing.name.trim(), balance: editing.balance } });
      toast.success(t.wallets.updated);
      setEditing(null);
    } catch (err) {
      setError((err as Error).message || t.wallets.updateFailed);
    }
  };

  const askDelete = (w: Wallet) => {
    setChoice("move");
    setTargetId(list.find((x) => x.id !== w.id)?.id ?? "");
    setPendingDelete(w);
  };

  const confirmDelete = async () => {
    const w = pendingDelete;
    setPendingDelete(null);
    if (!w) return;
    setError(null);
    const hasTx = (w.transactionCount ?? 0) > 0;
    const option: WalletDeleteOption = !hasTx ? {} : choice === "move" ? { mode: "move", targetId } : { mode: "delete-all" };
    try {
      await del.mutateAsync({ id: w.id, option });
      toast.success(fmt(t.wallets.deleted, { name: localizeWalletName(w.name, language) }));
    } catch (err) {
      setError((err as Error).message || t.wallets.deleteFailed);
    }
  };

  const deleting = (id: string) => del.isPending && del.variables?.id === id;
  const pendingHasTx = (pendingDelete?.transactionCount ?? 0) > 0;
  const pendingLabel = localizeWalletName(pendingDelete?.name, language);

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title={t.wallets.title}
        description={t.wallets.subtitle}
        icon={<WalletIcon className="text-brand-fg" />}
        closeLabel={t.common.close}
        size="md"
        variant="sheet"
      >
        <div className="space-y-6">
          {error && <InlineAlert>{error}</InlineAlert>}

          <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-line bg-surface-2/40 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Plus className="size-4 text-brand-fg" aria-hidden />
              {t.wallets.newTitle}
            </h3>
            <Field label={t.wallets.name} error={nameError}>
              <Input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.wallets.namePlaceholder}
                autoComplete="off"
                maxLength={50}
                required
              />
            </Field>
            <Field label={t.wallets.initial} optional={t.common.optional}>
              <AmountInput value={balance} onValueChange={setBalance} />
            </Field>
            <Button type="submit" block loading={create.isPending}>
              {create.isPending ? t.wallets.creating : t.wallets.create}
            </Button>
          </form>

          <section aria-labelledby="pockets-list" className="space-y-3">
            <h3 id="pockets-list" className="text-sm font-semibold text-fg">
              {fmt(t.wallets.list, { count: list.length })}
            </h3>
            {wallets.isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {list.map((w) => {
                    const label = localizeWalletName(w.name, language);
                    const last = list.length <= 1;
                    const isEditing = editing?.id === w.id;
                    return (
                      <motion.li
                        key={w.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className={cn("rounded-2xl border border-line bg-surface-1 p-3", isEditing && "border-brand/40")}
                      >
                        {isEditing ? (
                          <form onSubmit={saveEdit} noValidate className="space-y-3">
                            <Field label={t.wallets.name}>
                              <Input
                                autoFocus
                                value={editing.name}
                                maxLength={50}
                                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              />
                            </Field>
                            <Field label={t.wallets.balance} hint={t.wallets.balanceHint}>
                              <AmountInput value={editing.balance} onValueChange={(v) => setEditing({ ...editing, balance: v })} />
                            </Field>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                                <X aria-hidden />
                                {t.common.cancel}
                              </Button>
                              <Button type="submit" size="sm" loading={update.isPending}>
                                {!update.isPending && <Check aria-hidden />}
                                {t.wallets.saveChanges}
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-fg" aria-hidden>
                              <WalletIcon className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-fg">{label}</p>
                              <p className="flex flex-wrap items-center gap-x-2 text-sm text-fg-muted">
                                <Money value={w.balance} />
                                {typeof w.transactionCount === "number" && (
                                  <span className="text-xs text-fg-subtle">· {fmt(t.wallets.txCount, { count: w.transactionCount })}</span>
                                )}
                              </p>
                            </div>
                            <Tooltip content={fmt(t.wallets.edit, { name: label })}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditing({ id: w.id, name: w.name, balance: Math.max(0, toNumber(w.balance)) })}
                                aria-label={fmt(t.wallets.edit, { name: label })}
                              >
                                <Pencil aria-hidden />
                              </Button>
                            </Tooltip>
                            <Tooltip content={last ? t.wallets.cantDeleteLast : fmt(t.wallets.deleteLabel, { name: label })}>
                              <span>
                                <Button
                                  variant="danger-ghost"
                                  size="icon"
                                  disabled={last || deleting(w.id)}
                                  loading={deleting(w.id)}
                                  onClick={() => askDelete(w)}
                                  aria-label={fmt(t.wallets.deleteLabel, { name: label })}
                                >
                                  {!deleting(w.id) && <Trash2 aria-hidden />}
                                </Button>
                              </span>
                            </Tooltip>
                          </div>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </div>
      </ResponsiveModal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={fmt(t.wallets.deleteTitle, { name: pendingLabel })}
        description={
          pendingHasTx
            ? fmt(t.wallets.deleteHasTx, { name: pendingLabel, count: pendingDelete?.transactionCount ?? 0 })
            : t.wallets.deleteEmptyDesc
        }
        confirmLabel={t.wallets.deleteConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={confirmDelete}
        confirmDisabled={pendingHasTx && choice === "move" && !targetId}
      >
        {pendingHasTx && (
          <fieldset className="space-y-3">
            <legend className="sr-only">{t.wallets.deleteTitle}</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand/50 has-[:checked]:bg-brand/5">
              <input
                type="radio"
                name="wallet-delete"
                className="mt-1 accent-brand"
                checked={choice === "move"}
                onChange={() => setChoice("move")}
              />
              <span className="min-w-0 flex-1 space-y-2 text-sm text-fg">
                {t.wallets.deleteMove}
                {choice === "move" && (
                  <Field label={t.wallets.deleteMoveTarget} srOnlyLabel>
                    <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                      {list
                        .filter((x) => x.id !== pendingDelete?.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {localizeWalletName(x.name, language)}
                          </option>
                        ))}
                    </Select>
                  </Field>
                )}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-negative/50 has-[:checked]:bg-negative/5">
              <input
                type="radio"
                name="wallet-delete"
                className="mt-1"
                checked={choice === "delete-all"}
                onChange={() => setChoice("delete-all")}
              />
              <span className="text-sm text-fg">
                {t.wallets.deleteAll}
                <span className="mt-1 block text-xs text-fg-subtle">{t.wallets.deleteAllWarning}</span>
              </span>
            </label>
          </fieldset>
        )}
      </ConfirmDialog>
    </>
  );
}
