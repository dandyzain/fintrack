"use client";

import React, { useState } from "react";
import { X, PlusCircle, AlertCircle, Loader2, ArrowRight, Sparkles, Wallet, Calendar, Tag, FileText } from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletOption[];
  categories: CategoryOption[];
  onTransactionSaved: () => void;
}

export function ManualTransactionModal({
  isOpen,
  onClose,
  wallets,
  categories,
  onTransactionSaved,
}: ManualTransactionModalProps) {
  const { t } = useLanguage();
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id || "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [merchantName, setMerchantName] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if ((!walletId || !wallets.some((w) => w.id === walletId)) && wallets.length > 0) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId) {
      setErrorMsg(t.modals.walletRequiredError);
      return;
    }
    if (amount <= 0) {
      setErrorMsg(t.modals.amountZeroError);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          categoryId: categoryId || null,
          amount: Number(amount),
          type,
          date: new Date(date).toISOString(),
          merchantName: merchantName || null,
          notes: notes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || t.modals.saveFailed);
      }

      onTransactionSaved();
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#121826]/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-slate-200/90 dark:border-white/10 relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#121826]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md ring-2 ring-violet-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {t.modals.manualTitle}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20">
                  Bento Entry
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {t.modals.manualSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                type === "EXPENSE"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${type === "EXPENSE" ? "bg-white" : "bg-rose-500"}`} />
              <span>{t.modals.typeExpense}</span>
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                type === "INCOME"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${type === "INCOME" ? "bg-white" : "bg-cyan-400"}`} />
              <span>{t.modals.typeIncome}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.modals.amountLabel}
            </label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-3 text-lg font-black text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.modals.walletSelect}
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition font-semibold"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="dark:bg-slate-900 dark:text-slate-100">
                    {w.name} (Rp {Number(w.balance).toLocaleString("id-ID")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.modals.categorySelect}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition font-semibold"
              >
                <option value="" className="dark:bg-slate-900 dark:text-slate-100">{t.modals.selectCategoryPlaceholder}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900 dark:text-slate-100">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.modals.dateLabel}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.modals.merchantLabel}
              </label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder={t.modals.merchantPlaceholder}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.modals.notesLabel}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.modals.notesPlaceholder}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
            />
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 glow-btn-violet text-white rounded-xl text-xs font-bold disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-1.5"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isLoading ? t.modals.savingTransaction : t.modals.saveTransactionBtn}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
