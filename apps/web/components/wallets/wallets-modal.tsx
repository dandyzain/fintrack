"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import type { Wallet } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { useCreateWallet, useDeleteWallet, useWallets } from "@/lib/api/queries";
import { fmt, localizeWalletName } from "@/lib/i18n/translations";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AmountInput } from "@/components/ui/amount-input";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Money } from "@/components/ui/money";
import { InlineAlert, Skeleton } from "@/components/ui/feedback";
import { Tooltip } from "@/components/ui/tooltip";

export function WalletsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, language } = useLanguage();
  const wallets = useWallets();
  const create = useCreateWallet();
  const del = useDeleteWallet();
  const [name, setName] = React.useState("");
  const [balance, setBalance] = React.useState(0);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Wallet | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const list = wallets.data ?? [];

  React.useEffect(() => {
    if (!open) {
      setName("");
      setBalance(0);
      setNameError(null);
      setError(null);
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

  const confirmDelete = async () => {
    const w = pendingDelete;
    setPendingDelete(null);
    if (!w) return;
    setError(null);
    try {
      await del.mutateAsync(w.id);
      toast.success(fmt(t.wallets.deleted, { name: localizeWalletName(w.name, language) }));
    } catch (err) {
      setError((err as Error).message || t.wallets.deleteFailed);
    }
  };

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
                    return (
                      <motion.li
                        key={w.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex items-center gap-3 rounded-2xl border border-line bg-surface-1 p-3"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-fg" aria-hidden>
                          <WalletIcon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">{label}</p>
                          <Money value={w.balance} className="text-sm text-fg-muted" />
                        </div>
                        <Tooltip content={last ? t.wallets.cantDeleteLast : fmt(t.wallets.deleteLabel, { name: label })}>
                          <span>
                            <Button
                              variant="danger-ghost"
                              size="icon"
                              disabled={last || (del.isPending && del.variables === w.id)}
                              loading={del.isPending && del.variables === w.id}
                              onClick={() => setPendingDelete(w)}
                              aria-label={fmt(t.wallets.deleteLabel, { name: label })}
                            >
                              {!(del.isPending && del.variables === w.id) && <Trash2 aria-hidden />}
                            </Button>
                          </span>
                        </Tooltip>
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
        title={fmt(t.wallets.deleteTitle, { name: localizeWalletName(pendingDelete?.name, language) })}
        description={t.wallets.deleteDesc}
        confirmLabel={t.wallets.deleteConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={confirmDelete}
      />
    </>
  );
}
