"use client";

import dynamic from "next/dynamic";
import { useAppActions } from "@/context/app-actions-context";
import { EntryModal } from "@/components/transactions/entry-modal";
import { DetailSheet } from "@/components/transactions/detail-sheet";
import { WalletsModal } from "@/components/wallets/wallets-modal";
import { ReceiptViewer } from "@/components/transactions/receipt-viewer";

// Heavier, less frequently used overlays are split into their own chunks.
const ScannerModal = dynamic(() => import("@/components/scanner/scanner-modal").then((m) => m.ScannerModal), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/command/command-palette").then((m) => m.CommandPalette), { ssr: false });

/** Hosts every app-wide overlay so they can be opened from anywhere. */
export function GlobalOverlays() {
  const { modal, close, receiptUrl, closeReceipt } = useAppActions();
  const onOpenChange = (open: boolean) => !open && close();

  return (
    <>
      <ScannerModal open={modal.kind === "scanner"} onOpenChange={onOpenChange} />
      <EntryModal open={modal.kind === "entry"} onOpenChange={onOpenChange} />
      <WalletsModal open={modal.kind === "wallets"} onOpenChange={onOpenChange} />
      <DetailSheet open={modal.kind === "detail"} id={modal.kind === "detail" ? modal.id : null} onOpenChange={onOpenChange} />
      <CommandPalette open={modal.kind === "command"} onOpenChange={onOpenChange} />
      <ReceiptViewer url={receiptUrl} onClose={closeReceipt} />
    </>
  );
}
