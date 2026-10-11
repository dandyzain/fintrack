"use client";

import React, { useState } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  X,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface WalletItem {
  id: string;
  name: string;
  balance: number;
}

interface WalletManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletItem[];
  onWalletUpdated: () => void;
}

export function WalletManagementModal({
  isOpen,
  onClose,
  wallets,
  onWalletUpdated,
}: WalletManagementModalProps) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(t.modals.pocketNameRequired);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const numBalance = parseFloat(balance.replace(/[^0-9]/g, "")) || 0;

      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          balance: numBalance,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create pocket.");
      }

      setSuccessMsg(
        language === "id"
          ? `Kantong "${name.trim()}" berhasil dibuat!`
          : `Pocket "${name.trim()}" created successfully!`
      );
      setName("");
      setBalance("");
      onWalletUpdated();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWallet = async (wallet: WalletItem) => {
    if (wallets.length <= 1) {
      setErrorMsg(t.modals.cantDeleteLastWallet);
      return;
    }

    const confirmMsg =
      language === "id"
        ? `Apakah Anda yakin ingin menghapus kantong "${wallet.name}"? Semua transaksi yang terkait akan ikut terhapus.`
        : `Are you sure you want to delete pocket "${wallet.name}"? All related transactions will be removed.`;
    const confirmDelete = window.confirm(confirmMsg);
    if (!confirmDelete) return;

    setDeletingId(wallet.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/wallets/${wallet.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete pocket.");
      }

      setSuccessMsg(
        language === "id"
          ? `Kantong "${wallet.name}" berhasil dihapus.`
          : `Pocket "${wallet.name}" deleted successfully.`
      );
      onWalletUpdated();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#121826]/95 border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#121826]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md ring-2 ring-violet-500/20 flex-shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  {t.modals.walletModalTitle}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Virtual Deck
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                {t.modals.walletModalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form: Tambah Kantong Baru */}
          <form
            onSubmit={handleCreateWallet}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 space-y-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-violet-500" />
                <span>{t.modals.newWalletTitle}</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">{t.common.freeOfCharge}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modals.pocketNameLabel}
              </label>
              <input
                type="text"
                placeholder={t.modals.pocketNamePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.modals.initialBalanceLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                  Rp
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 font-bold transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white glow-btn-violet shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.modals.processingPocket}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{t.modals.createPocketBtn}</span>
                </>
              )}
            </button>
          </form>

          {/* Daftar Kantong Saat Ini */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {language === "id" ? `Daftar Kantong Anda (${wallets.length})` : `Your Pockets List (${wallets.length})`}
              </h4>
              <span className="text-[10px] text-slate-400">
                {language === "id" ? "Klik sampah untuk menghapus" : "Click trash to delete"}
              </span>
            </div>

            <div className="space-y-2">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 flex items-center justify-between gap-3 shadow-sm hover:border-violet-500/30 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600/20 to-cyan-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0 border border-violet-500/20 shadow-xs">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {w.name}
                      </p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">
                        Rp {Number(w.balance || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteWallet(w)}
                    disabled={deletingId === w.id || wallets.length <= 1}
                    title={
                      wallets.length <= 1
                        ? t.modals.cantDeleteLastWallet
                        : language === "id"
                        ? "Hapus kantong ini"
                        : "Delete this pocket"
                    }
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
                  >
                    {deletingId === w.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-[#121826]/80 backdrop-blur-md">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{language === "id" ? "Tersinkronisasi otomatis" : "Automatically synchronized"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
