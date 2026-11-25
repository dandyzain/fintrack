"use client";

import * as React from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";
import { useCategories, useCreateTransaction, useWallets } from "@/lib/api/queries";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import {
  LAST_WALLET_KEY,
  TransactionForm,
  defaultFormValues,
  toPayload,
  validateForm,
  type TransactionFormValues,
} from "./transaction-form";

export function EntryModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useLanguage();
  const wallets = useWallets();
  const categories = useCategories();
  const create = useCreateTransaction();
  const [values, setValues] = React.useState<TransactionFormValues>(() => defaultFormValues([]));
  const [errors, setErrors] = React.useState<ReturnType<typeof validateForm>>({});
  const [error, setError] = React.useState<string | null>(null);

  // Fresh form each time the modal opens (remembers the last-used pocket).
  React.useEffect(() => {
    if (open) {
      setValues(defaultFormValues(wallets.data ?? []));
      setErrors({});
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (open && !values.walletId && wallets.data?.length) {
      setValues((v) => ({ ...v, walletId: defaultFormValues(wallets.data).walletId }));
    }
  }, [open, wallets.data, values.walletId]);

  const submit = async () => {
    const errs = validateForm(values, t);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    try {
      await create.mutateAsync(toPayload(values));
      try {
        localStorage.setItem(LAST_WALLET_KEY, values.walletId);
      } catch {
        /* ignore */
      }
      toast.success(t.entry.saved);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message || t.entry.saveFailed);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t.entry.title}
      description={t.entry.subtitle}
      icon={<PenLine className="text-brand-fg" />}
      closeLabel={t.common.close}
      size="lg"
      dismissible={!create.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="entry-form" loading={create.isPending}>
            {create.isPending ? t.entry.saving : t.entry.save}
          </Button>
        </>
      }
    >
      <TransactionForm
        id="entry-form"
        values={values}
        onChange={setValues}
        onSubmit={submit}
        wallets={wallets.data ?? []}
        categories={categories.data ?? []}
        error={error}
        fieldErrors={errors}
        autoFocusAmount
      />
    </ResponsiveModal>
  );
}
