"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Sparkles,
  Loader2,
  ArrowRight,
  ScanLine,
  Zap,
} from "lucide-react";
import type { ReceiptExtraction, ReceiptItem } from "@fintrack/shared";

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

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletOption[];
  categories: CategoryOption[];
  onTransactionSaved: () => void;
}

export function ReceiptScannerModal({
  isOpen,
  onClose,
  wallets,
  categories,
  onTransactionSaved,
}: ReceiptScannerModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<"upload" | "review">("upload");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Review state populated from Vision AI output
  const [merchantName, setMerchantName] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    wallets[0]?.id || ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null);
  const [rawOcrData, setRawOcrData] = useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    if ((!selectedWalletId || !wallets.some((w) => w.id === selectedWalletId)) && wallets.length > 0) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [wallets, selectedWalletId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setErrorMsg("Pilih gambar struk terlebih dahulu.");
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/receipts/scan", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memindai struk belanja.");
      }

      const extraction: ReceiptExtraction =
        json.data.extractedData || json.data.extraction;
      setMerchantName(extraction.merchantName || "");

      // Handle date formatting
      if (extraction.date) {
        setTransactionDate(extraction.date);
      } else {
        setTransactionDate(new Date().toISOString().split("T")[0]);
      }

      setTotalAmount(extraction.totalAmount || 0);
      setTax(extraction.tax || 0);
      setServiceCharge(extraction.serviceCharge || 0);
      setItems(extraction.items || []);
      setUploadedReceiptUrl(json.data.receiptImageUrl || null);
      setRawOcrData(json.data.rawOcrData || null);

      // Auto-assign category if matched
      if (extraction.suggestedCategory) {
        const matchedCat = categories.find(
          (c) =>
            c.name.toLowerCase() ===
            extraction.suggestedCategory?.toLowerCase()
        );
        if (matchedCat) {
          setSelectedCategoryId(matchedCat.id);
        }
      }

      setScanStep("review");
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number
  ) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: field === "price" || field === "quantity" ? Number(value) : value,
    };
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { name: "", price: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleConfirmSave = async () => {
    if (!selectedWalletId) {
      setErrorMsg("Pilih dompet sumber pembayaran.");
      return;
    }
    if (totalAmount <= 0) {
      setErrorMsg("Total nominal transaksi harus lebih dari 0.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      // Parse date safely from DD/MM/YYYY, YYYY-MM-DD, or ISO
      let safeIsoDate = new Date().toISOString();
      if (transactionDate) {
        const dmy = String(transactionDate).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) {
          const [_, d, m, y] = dmy;
          const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
          if (!isNaN(dt.getTime())) safeIsoDate = dt.toISOString();
        } else {
          const dt = new Date(transactionDate);
          if (!isNaN(dt.getTime())) safeIsoDate = dt.toISOString();
        }
      }

      const payload = {
        walletId: selectedWalletId,
        categoryId: selectedCategoryId && selectedCategoryId.trim() !== "" ? selectedCategoryId.trim() : null,
        amount: Number(totalAmount),
        type: "EXPENSE",
        date: safeIsoDate,
        merchantName: merchantName ? merchantName.trim() : null,
        notes: notes ? notes.trim() : null,
        receiptImageUrl: uploadedReceiptUrl ? String(uploadedReceiptUrl).trim() : null,
        rawOcrData: rawOcrData || null,
        items: items
          .filter((item) => item.name.trim() !== "" && Number(item.price) >= 0)
          .map((item) => ({
            name: item.name.trim(),
            price: Number(item.price),
            quantity: Number(item.quantity) || 1,
          })),
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan transaksi.");
      }

      // Success Celebration Animation
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        onTransactionSaved();
        handleClose();
      }, 1200);
    } catch (err) {
      setErrorMsg((err as Error).message);
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsScanning(false);
    setScanStep("upload");
    setErrorMsg(null);
    setItems([]);
    setShowCelebration(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-[#121826]/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[94vh] overflow-y-auto flex flex-col border border-slate-200/90 dark:border-white/10 relative">
        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#121826]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-4 shadow-lg ring-4 ring-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Transaksi Berhasil Disimpan!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs font-medium">
              Saldo dompet telah diperbarui secara otomatis dan laporan keuangan telah disegarkan.
            </p>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#121826]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md ring-2 ring-cyan-500/20 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {scanStep === "upload"
                    ? "Pindai Struk Belanja (Vision AI)"
                    : "Tinjau & Konfirmasi Ekstraksi Struk"}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> AI Vision
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {scanStep === "upload"
                  ? "Ekstraksi data struk belanja instan bertenaga Vision AI"
                  : "Periksa kembali nominal sebelum dimasukkan ke pembukuan"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {scanStep === "upload" ? (
            /* STEP 1: Upload and Preview */
            <div className="space-y-4">
              <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 dark:border-cyan-500/20 dark:hover:border-cyan-500/50 rounded-3xl p-6 sm:p-8 text-center transition bg-cyan-500/[0.02] dark:bg-cyan-500/[0.04] group">
                <input
                  type="file"
                  id="receipt-file-input"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="receipt-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 rounded-2xl text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm border border-cyan-500/20 group-hover:scale-105 transition">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm hover:underline">
                      Pilih foto struk belanja
                    </span>{" "}
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">atau seret berkas ke sini</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    Mendukung JPG, PNG, WebP (maksimal 10MB)
                  </p>
                </label>
              </div>

              {/* Live Preview */}
              {previewUrl && (
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 relative overflow-hidden shadow-sm">
                  <div className="w-20 h-24 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 flex-shrink-0 relative self-center sm:self-auto shadow-sm">
                    <img
                      src={previewUrl}
                      alt="Preview Struk"
                      className="w-full h-full object-cover"
                    />

                    {isScanning && (
                      <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-scan-beam" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    {isScanning && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-cyan-600 dark:text-cyan-400 font-bold animate-pulse">
                        <ScanLine className="w-3.5 h-3.5 animate-spin" />
                        <span>Menganalisis teks & angka struk dengan Vision AI...</span>
                      </div>
                    )}
                  </div>

                  {!isScanning && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="self-end sm:self-center p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Review & Edit Form */
            <div className="space-y-4 sm:space-y-5">
              <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-2xl text-slate-700 dark:text-slate-300 text-xs flex items-start sm:items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span className="font-medium">
                  Hasil ekstraksi Vision AI siap dikoreksi. Pastikan nominal dan dompet sumber dana sudah tepat sebelum konfirmasi.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Toko / Merchant
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="Contoh: Indomaret, Superindo"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Pembayaran (Rp) *
                  </label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 text-sm font-black text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dompet Sumber Dana *
                  </label>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition font-semibold"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} className="dark:bg-slate-900 dark:text-slate-100">
                        {w.name} (Saldo: Rp {Number(w.balance).toLocaleString("id-ID")})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition font-semibold"
                  >
                    <option value="" className="dark:bg-slate-900 dark:text-slate-100">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900 dark:text-slate-100">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pajak & Biaya Layanan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Pajak"
                      value={tax}
                      onChange={(e) => setTax(Number(e.target.value))}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      placeholder="Layanan"
                      value={serviceCharge}
                      onChange={(e) => setServiceCharge(Number(e.target.value))}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Item Barang */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rincian Barang Belanja ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 px-2 py-0.5 rounded-lg hover:bg-cyan-500/10 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                      Tidak ada rincian per-item yang terdeteksi.
                    </div>
                  ) : (
                    items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-xs"
                      >
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                          placeholder="Nama item"
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                        />
                        <input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          placeholder="Qty"
                          className="w-14 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center font-medium"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.price || 0}
                            onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                            placeholder="Harga"
                            className="flex-1 sm:w-28 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-right font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan transaksi..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-0 rounded-b-3xl">
          {scanStep === "upload" ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition text-center"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedFile || isScanning}
                onClick={handleScan}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 glow-btn-cyan text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengekstrak dengan Vision AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Pindai Struk Sekarang</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setScanStep("upload")}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition text-center"
              >
                Pindai Ulang
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSave}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 glow-btn-violet text-white rounded-xl text-xs font-bold disabled:opacity-50 transition shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi & Simpan Transaksi</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
