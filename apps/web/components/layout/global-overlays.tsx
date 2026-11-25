"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAppActions } from "@/context/app-actions-context";

/*
 * Every overlay lives in its own chunk (vaul, forms, cmdk, scanner) so none of
 * it is in the initial bundle. Chunks are prefetched when the browser is idle,
 * and each overlay mounts the first time it is opened (then stays mounted so
 * its exit animation can play).
 */
const loaders = {
  scanner: () => import("@/components/scanner/scanner-modal"),
  entry: () => import("@/components/transactions/entry-modal"),
  wallets: () => import("@/components/wallets/wallets-modal"),
  detail: () => import("@/components/transactions/detail-sheet"),
  command: () => import("@/components/command/command-palette"),
  receipt: () => import("@/components/transactions/receipt-viewer"),
};

const ScannerModal = dynamic(() => loaders.scanner().then((m) => m.ScannerModal), { ssr: false });
const EntryModal = dynamic(() => loaders.entry().then((m) => m.EntryModal), { ssr: false });
const WalletsModal = dynamic(() => loaders.wallets().then((m) => m.WalletsModal), { ssr: false });
const DetailSheet = dynamic(() => loaders.detail().then((m) => m.DetailSheet), { ssr: false });
const CommandPalette = dynamic(() => loaders.command().then((m) => m.CommandPalette), { ssr: false });
const ReceiptViewer = dynamic(() => loaders.receipt().then((m) => m.ReceiptViewer), { ssr: false });

type Kind = keyof typeof loaders;

export function GlobalOverlays() {
  const { modal, close, receiptUrl, closeReceipt } = useAppActions();
  const [mounted, setMounted] = useState<Set<Kind>>(() => new Set());
  const onOpenChange = (open: boolean) => !open && close();

  useEffect(() => {
    const kind = modal.kind === "none" ? null : (modal.kind as Kind);
    const extra: Kind | null = receiptUrl ? "receipt" : null;
    setMounted((prev) => {
      const next = new Set(prev);
      if (kind) next.add(kind);
      if (extra) next.add(extra);
      return next.size === prev.size ? prev : next;
    });
  }, [modal.kind, receiptUrl]);

  // Warm the chunks well after load, when the browser is idle, so first open
  // feels instant without competing with hydration.
  useEffect(() => {
    let timer = 0;
    let idle = 0;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const warm = () => Object.values(loaders).forEach((load) => void load());
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (w.requestIdleCallback) idle = w.requestIdleCallback(warm, { timeout: 5000 });
        else warm();
      }, 3000);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      window.clearTimeout(timer);
      if (idle) w.cancelIdleCallback?.(idle);
    };
  }, []);

  return (
    <>
      {mounted.has("scanner") && <ScannerModal open={modal.kind === "scanner"} onOpenChange={onOpenChange} />}
      {mounted.has("entry") && <EntryModal open={modal.kind === "entry"} onOpenChange={onOpenChange} />}
      {mounted.has("wallets") && <WalletsModal open={modal.kind === "wallets"} onOpenChange={onOpenChange} />}
      {mounted.has("detail") && (
        <DetailSheet open={modal.kind === "detail"} id={modal.kind === "detail" ? modal.id : null} onOpenChange={onOpenChange} />
      )}
      {mounted.has("command") && <CommandPalette open={modal.kind === "command"} onOpenChange={onOpenChange} />}
      {mounted.has("receipt") && <ReceiptViewer url={receiptUrl} onClose={closeReceipt} />}
    </>
  );
}
