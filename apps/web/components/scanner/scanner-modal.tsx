"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, Check, ImagePlus, Plus, ScanLine, Sparkles, Trash2, UploadCloud, Wallet as WalletIcon, X } from "lucide-react";
import { toast } from "sonner";
import type { ReceiptItem } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { useCategories, useCreateTransaction, useScanReceipt, useWallets } from "@/lib/api/queries";
import { fmt, localizeCategoryName, localizeWalletName } from "@/lib/i18n/translations";
import { formatIDR, normalizeDateInput, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { AmountInput } from "@/components/ui/amount-input";
import { InlineAlert } from "@/components/ui/feedback";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { LAST_WALLET_KEY, defaultFormValues } from "@/components/transactions/transaction-form";

type Step = "capture" | "analyzing" | "review" | "done";
type AiField = "merchant" | "date" | "total" | "tax" | "service" | "category" | "items";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 10 * 1024 * 1024;

interface ReviewState {
  merchantName: string;
  date: string;
  total: number;
  tax: number;
  service: number;
  items: ReceiptItem[];
  walletId: string;
  categoryId: string;
  notes: string;
  receiptImageUrl: string | null;
  rawOcrData: Record<string, unknown> | null;
}

const emptyReview = (walletId = ""): ReviewState => ({
  merchantName: "",
  date: toDateInputValue(new Date()),
  total: 0,
  tax: 0,
  service: 0,
  items: [],
  walletId,
  categoryId: "",
  notes: "",
  receiptImageUrl: null,
  rawOcrData: null,
});

/** Same date handling the original scanner used (DD/MM/YYYY, YYYY-MM-DD, ISO). */
function toSafeIso(raw: string): string {
  let safe = new Date().toISOString();
  if (raw) {
    const dmy = String(raw).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
      const [, d, m, y] = dmy;
      const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      if (!Number.isNaN(dt.getTime())) safe = dt.toISOString();
    } else {
      const dt = new Date(raw);
      if (!Number.isNaN(dt.getTime())) safe = dt.toISOString();
    }
  }
  return safe;
}

export function ScannerModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, language } = useLanguage();
  const reduce = useReducedMotion();
  const wallets = useWallets();
  const categories = useCategories();
  const scan = useScanReceipt();
  const create = useCreateTransaction();

  const [step, setStep] = React.useState<Step>("capture");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState(0);
  const [review, setReview] = React.useState<ReviewState>(emptyReview());
  const [aiFields, setAiFields] = React.useState<Set<AiField>>(new Set());
  const fileInput = React.useRef<HTMLInputElement>(null);
  const cameraInput = React.useRef<HTMLInputElement>(null);

  const stages = [t.scanner.stageUpload, t.scanner.stageRead, t.scanner.stageExtract, t.scanner.stageCategorize];

  const reset = React.useCallback(() => {
    setStep("capture");
    setFile(null);
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    setError(null);
    setStage(0);
    setAiFields(new Set());
    setReview(emptyReview());
    setDragging(false);
  }, []);

  React.useEffect(() => {
    if (!open) {
      const id = window.setTimeout(reset, 250); // after exit animation
      return () => window.clearTimeout(id);
    }
  }, [open, reset]);

  const accept = React.useCallback(
    (f: File | null | undefined) => {
      setError(null);
      if (!f) return;
      if (f.type && !ACCEPTED.includes(f.type) && !f.type.startsWith("image/")) {
        setError(t.scanner.invalidType);
        return;
      }
      if (f.size > MAX_BYTES) {
        setError(t.scanner.tooLarge);
        return;
      }
      setFile(f);
      setPreview((p) => {
        if (p) URL.revokeObjectURL(p);
        return URL.createObjectURL(f);
      });
    },
    [t]
  );

  // Paste an image from the clipboard while capturing.
  React.useEffect(() => {
    if (!open || step !== "capture") return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (item) {
        e.preventDefault();
        accept(item.getAsFile());
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, step, accept]);

  // Cycle honest, indeterminate status messages while the AI works.
  React.useEffect(() => {
    if (step !== "analyzing") return;
    const id = window.setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 1400);
    return () => window.clearInterval(id);
  }, [step, stages.length]);

  const startScan = async () => {
    if (!file) {
      setError(t.scanner.selectFirst);
      return;
    }
    setError(null);
    setStage(0);
    setStep("analyzing");
    try {
      const { extraction: x, receiptImageUrl, rawOcrData } = await scan.mutateAsync(file);
      const filled = new Set<AiField>();
      const cats = categories.data ?? [];
      const suggested = x.suggestedCategory?.toLowerCase();
      const matched = suggested
        ? cats.find(
            (c) =>
              c.name.toLowerCase() === suggested ||
              localizeCategoryName(c.name, "id").toLowerCase() === suggested
          )
        : undefined;

      if (x.merchantName) filled.add("merchant");
      if (x.date) filled.add("date");
      if (x.totalAmount) filled.add("total");
      if (x.tax) filled.add("tax");
      if (x.serviceCharge) filled.add("service");
      if (matched) filled.add("category");
      if (x.items?.length) filled.add("items");

      setReview({
        merchantName: x.merchantName || "",
        date: normalizeDateInput(x.date) || toDateInputValue(new Date()),
        total: x.totalAmount || 0,
        tax: x.tax || 0,
        service: x.serviceCharge || 0,
        items: x.items || [],
        walletId: defaultFormValues(wallets.data ?? []).walletId,
        categoryId: matched?.id ?? "",
        notes: "",
        receiptImageUrl,
        rawOcrData,
      });
      setAiFields(filled);
      setStep("review");
    } catch (e) {
      setError((e as Error).message || t.scanner.scanFailed);
      setStep("capture");
    }
  };

  const set = <K extends keyof ReviewState>(k: K, v: ReviewState[K]) => setReview((r) => ({ ...r, [k]: v }));
  const setItem = (i: number, patch: Partial<ReceiptItem>) =>
    setReview((r) => ({ ...r, items: r.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));

  const itemsSum = review.items.reduce((s, it) => s + Number(it.price || 0) * (Number(it.quantity) || 1), 0);
  const computed = itemsSum + review.tax + review.service;
  const mismatch = review.items.length > 0 && review.total > 0 && Math.abs(computed - review.total) > 1;

  const save = async () => {
    if (!review.walletId) {
      setError(t.scanner.walletRequired);
      return;
    }
    if (review.total <= 0) {
      setError(t.scanner.amountZero);
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        walletId: review.walletId,
        categoryId: review.categoryId.trim() || null,
        amount: Number(review.total),
        type: "EXPENSE",
        date: toSafeIso(review.date),
        merchantName: review.merchantName.trim() || null,
        notes: review.notes.trim() || null,
        receiptImageUrl: review.receiptImageUrl ? String(review.receiptImageUrl).trim() : null,
        rawOcrData: review.rawOcrData || null,
        items: review.items
          .filter((it) => it.name.trim() !== "" && Number(it.price) >= 0)
          .map((it) => ({ name: it.name.trim(), price: Number(it.price), quantity: Number(it.quantity) || 1 })),
      });
      try {
        localStorage.setItem(LAST_WALLET_KEY, review.walletId);
      } catch {
        /* ignore */
      }
      setStep("done");
      window.setTimeout(() => {
        onOpenChange(false);
        toast.success(t.scanner.successTitle, { description: t.scanner.successDesc });
      }, reduce ? 300 : 1300);
    } catch (e) {
      setError((e as Error).message || t.scanner.saveFailed);
    }
  };

  const ai = (f: AiField) => aiFields.has(f);
  const aiBadge = (f: AiField) =>
    ai(f) ? (
      <Badge tone="ai" className="px-1.5 py-0">
        <Sparkles aria-hidden />
        {t.scanner.aiFilled}
      </Badge>
    ) : null;

  const stepIndex = step === "capture" ? 0 : step === "analyzing" ? 1 : 2;

  const footer =
    step === "capture" ? (
      <>
        <Button key="cancel" variant="ghost" onClick={() => onOpenChange(false)}>
          {t.common.cancel}
        </Button>
        <Button key="scan" variant="ai" onClick={startScan} disabled={!file}>
          <ScanLine aria-hidden />
          {t.scanner.start}
        </Button>
      </>
    ) : step === "review" ? (
      <>
        <Button key="rescan" variant="ghost" onClick={reset} disabled={create.isPending}>
          {t.scanner.rescan}
        </Button>
        <Button key="save" type="submit" form="scan-review" loading={create.isPending}>
          <Check aria-hidden />
          {create.isPending ? t.scanner.saving : t.scanner.confirm}
        </Button>
      </>
    ) : undefined;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={step === "review" ? t.scanner.reviewTitle : t.scanner.title}
      description={step === "review" ? t.scanner.reviewSubtitle : t.scanner.subtitle}
      icon={
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-ai to-[#38BDF8] text-ai-ink shadow-glow-ai">
          <ScanLine className="size-5" />
        </span>
      }
      closeLabel={t.common.close}
      size={step === "review" ? "xl" : "lg"}
      tall={step === "review"}
      dismissible={step !== "analyzing" && !create.isPending && step !== "done"}
      footer={footer}
      headerExtra={
        step !== "done" ? (
          <ol className="mt-3 flex items-center gap-2" aria-label={t.scanner.title}>
            {[t.scanner.stepCapture, t.scanner.stepAnalyze, t.scanner.stepReview].map((label, i) => (
              <li key={label} className="flex items-center gap-2" aria-current={i === stepIndex ? "step" : undefined}>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold",
                    i <= stepIndex ? "text-ai-fg" : "text-fg-subtle"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[0.75rem]",
                      i < stepIndex ? "bg-ai text-ai-ink" : i === stepIndex ? "bg-ai/15 ring-1 ring-ai/50" : "bg-surface-2"
                    )}
                  >
                    {i < stepIndex ? <Check className="size-3" aria-hidden /> : i + 1}
                  </span>
                  {label}
                </span>
                {i < 2 && <span aria-hidden className={cn("h-px w-6", i < stepIndex ? "bg-ai" : "bg-line")} />}
              </li>
            ))}
          </ol>
        ) : null
      }
    >
      {error && <InlineAlert className="mb-4">{error}</InlineAlert>}

      <AnimatePresence mode="wait" initial={false}>
        {step === "capture" && (
          <motion.div key="capture" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {!preview ? (
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  accept(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-all duration-slow ease-emphasized sm:py-14",
                  dragging ? "scale-[1.01] border-ai bg-ai/10 shadow-glow-ai" : "border-line-strong bg-surface-2/40"
                )}
              >
                <motion.span
                  aria-hidden
                  animate={dragging ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
                  className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-ai/20 to-brand/20 text-ai-fg ring-1 ring-ai/30"
                >
                  <UploadCloud className="size-7" />
                </motion.span>
                <div>
                  <p className="text-base font-semibold text-fg">{dragging ? t.scanner.dropActive : t.scanner.dropTitle}</p>
                  <p className="mt-1 text-sm text-fg-subtle">{t.scanner.formats}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => fileInput.current?.click()}>
                    <ImagePlus aria-hidden />
                    {t.scanner.browse}
                  </Button>
                  <Button variant="outline" className="coarse:inline-flex fine:hidden" onClick={() => cameraInput.current?.click()}>
                    <Camera aria-hidden />
                    {t.scanner.takePhoto}
                  </Button>
                </div>
                <p className="hidden text-xs text-fg-subtle fine:block">{t.scanner.pasteHint}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="relative h-56 w-44 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-elev-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={t.scanner.receiptPreview} className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <p className="truncate text-sm font-semibold text-fg">{file?.name}</p>
                    <p className="text-sm text-fg-subtle">{((file?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setPreview((p) => {
                        if (p) URL.revokeObjectURL(p);
                        return null;
                      });
                    }}
                  >
                    <Trash2 aria-hidden />
                    {t.scanner.replace}
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                accept(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                accept(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </motion.div>
        )}

        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-4"
          >
            <div className="relative h-72 w-56 overflow-hidden rounded-2xl border border-ai/40 bg-surface-2 shadow-glow-ai">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={t.scanner.receiptPreview} className="size-full object-cover opacity-90" />
              )}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ai/5 via-transparent to-ai/10" />
              <div
                aria-hidden
                className="absolute inset-x-0 h-16 -translate-y-full animate-scan-beam bg-gradient-to-b from-transparent via-ai/35 to-transparent"
              >
                <div className="absolute inset-x-0 bottom-1/2 h-0.5 bg-ai shadow-[0_0_16px_4px_rgb(var(--ai)/0.6)]" />
              </div>
              {(["top-3 left-3 border-l-2 border-t-2", "top-3 right-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"] as const).map((c) => (
                <span key={c} aria-hidden className={cn("absolute size-6 rounded-sm border-ai", c)} />
              ))}
            </div>
            <div className="h-6" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-2 text-sm font-semibold text-ai-fg"
                >
                  <Sparkles className="size-4 animate-pulse" aria-hidden />
                  {stages[stage]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {step === "review" && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr]">
              <aside className="lg:sticky lg:top-0 lg:self-start">
                {preview && (
                  <div className="mx-auto h-40 w-32 overflow-hidden rounded-2xl border border-line shadow-elev-1 lg:h-[22rem] lg:w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={t.scanner.receiptPreview} className="size-full object-cover" />
                  </div>
                )}
              </aside>

              <form
                id="scan-review"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
                className="space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t.scanner.merchant} badge={aiBadge("merchant")}>
                    <Input
                      value={review.merchantName}
                      onChange={(e) => set("merchantName", e.target.value)}
                      placeholder={t.scanner.merchantPlaceholder}
                      className={cn(ai("merchant") && "ai-filled")}
                    />
                  </Field>
                  <Field label={t.scanner.date} badge={aiBadge("date")}>
                    <Input
                      type="date"
                      value={review.date}
                      onChange={(e) => set("date", e.target.value)}
                      className={cn(ai("date") && "ai-filled")}
                    />
                  </Field>
                </div>

                <Field label={t.scanner.total} badge={aiBadge("total")}>
                  <AmountInput
                    size="lg"
                    value={review.total}
                    onValueChange={(v) => set("total", v)}
                    className={cn(ai("total") && "ai-filled")}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t.scanner.tax} badge={aiBadge("tax")}>
                    <AmountInput value={review.tax} onValueChange={(v) => set("tax", v)} className={cn(ai("tax") && "ai-filled")} />
                  </Field>
                  <Field label={t.scanner.service} badge={aiBadge("service")}>
                    <AmountInput
                      value={review.service}
                      onValueChange={(v) => set("service", v)}
                      className={cn(ai("service") && "ai-filled")}
                    />
                  </Field>
                  <Field label={t.scanner.pocket}>
                    <Select value={review.walletId} onChange={(e) => set("walletId", e.target.value)} leadingIcon={<WalletIcon />}>
                      {(wallets.data ?? []).map((w) => (
                        <option key={w.id} value={w.id}>
                          {localizeWalletName(w.name, language)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <fieldset className="space-y-2">
                  <legend className="flex items-center gap-2 text-sm font-medium text-fg">
                    {t.scanner.category} {aiBadge("category")}
                  </legend>
                  <CategoryPicker
                    categories={categories.data ?? []}
                    value={review.categoryId}
                    onChange={(v) => set("categoryId", v)}
                    label={t.scanner.category}
                    noneLabel={t.scanner.noCategory}
                    aiSuggested={ai("category")}
                  />
                </fieldset>

                <section aria-labelledby="items-label" className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="items-label" className="flex items-center gap-2 text-sm font-medium text-fg">
                      {fmt(t.scanner.items, { count: review.items.length })} {aiBadge("items")}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => set("items", [...review.items, { name: "", price: 0, quantity: 1 }])}
                    >
                      <Plus aria-hidden />
                      {t.scanner.addItem}
                    </Button>
                  </div>

                  {review.items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-fg-subtle">{t.scanner.noItems}</p>
                  ) : (
                    <ul className="space-y-2">
                      <AnimatePresence initial={false}>
                        {review.items.map((it, i) => (
                          <motion.li
                            key={i}
                            layout={!reduce}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-[1fr_4.5rem] gap-2 rounded-xl border border-line bg-surface-2/40 p-2 sm:grid-cols-[1fr_4.5rem_9rem_auto]"
                          >
                            <Input
                              aria-label={t.scanner.itemName}
                              placeholder={t.scanner.itemName}
                              value={it.name}
                              onChange={(e) => setItem(i, { name: e.target.value })}
                              className="h-10 coarse:h-11"
                            />
                            <Input
                              aria-label={t.scanner.itemQty}
                              type="text"
                              inputMode="numeric"
                              value={String(it.quantity || 1)}
                              onChange={(e) => setItem(i, { quantity: Number(e.target.value.replace(/\D/g, "")) || 1 })}
                              className="tabular h-10 text-center coarse:h-11"
                            />
                            <div className="col-span-1 sm:col-span-1">
                              <AmountInput
                                aria-label={t.scanner.itemPrice}
                                value={Number(it.price) || 0}
                                onValueChange={(v) => setItem(i, { price: v })}
                                className="h-10 coarse:h-11"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => set("items", review.items.filter((_, idx) => idx !== i))}
                              aria-label={t.scanner.removeItem}
                              className="grid size-10 place-items-center justify-self-end rounded-lg text-fg-subtle transition hover:bg-negative/10 hover:text-negative-fg coarse:size-11"
                            >
                              <X className="size-4" aria-hidden />
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}

                  {mismatch && (
                    <InlineAlert tone="warning">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {fmt(t.scanner.itemsMismatch, {
                            amount: formatIDR(computed, { lang: language }),
                            diff: formatIDR(Math.abs(computed - review.total), { lang: language }),
                          })}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => set("total", computed)}>
                          {fmt(t.scanner.useItemsTotal, { amount: formatIDR(computed, { lang: language }) })}
                        </Button>
                      </div>
                    </InlineAlert>
                  )}
                </section>

                <Field label={t.scanner.notes} optional={t.common.optional}>
                  <Input
                    value={review.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder={t.scanner.notesPlaceholder}
                    maxLength={500}
                  />
                </Field>
              </form>
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-12 text-center"
            role="status"
          >
            <div className="relative">
              {!reduce &&
                Array.from({ length: 10 }).map((_, i) => (
                  <motion.span
                    key={i}
                    aria-hidden
                    className={cn("absolute left-1/2 top-1/2 size-2 rounded-full", i % 3 === 0 ? "bg-ai" : i % 3 === 1 ? "bg-brand" : "bg-positive")}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                    animate={{
                      x: Math.cos((i / 10) * Math.PI * 2) * 64,
                      y: Math.sin((i / 10) * Math.PI * 2) * 64,
                      opacity: 0,
                      scale: 1,
                    }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                  />
                ))}
              <span className="grid size-20 place-items-center rounded-full bg-positive/15 ring-8 ring-positive/10">
                <svg viewBox="0 0 24 24" className="size-10 text-positive-fg" aria-hidden>
                  <motion.path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: reduce ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </svg>
              </span>
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-fg">{t.scanner.successTitle}</p>
              <p className="mt-1 text-sm text-fg-subtle">{t.scanner.successDesc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveModal>
  );
}
