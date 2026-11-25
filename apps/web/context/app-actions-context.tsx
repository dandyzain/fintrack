"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Modal =
  | { kind: "none" }
  | { kind: "scanner" }
  | { kind: "entry" }
  | { kind: "wallets" }
  | { kind: "detail"; id: string }
  | { kind: "command" };

interface AppActions {
  modal: Modal;
  openScanner: () => void;
  openEntry: () => void;
  openWallets: () => void;
  openDetail: (id: string) => void;
  openCommand: () => void;
  close: () => void;
  receiptUrl: string | null;
  openReceipt: (url: string) => void;
  closeReceipt: () => void;
}

const Ctx = createContext<AppActions | null>(null);

/** Global overlays (scanner, entry, pockets, details, ⌘K) open from anywhere. */
export function AppActionsProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const close = useCallback(() => setModal({ kind: "none" }), []);

  const value = useMemo<AppActions>(
    () => ({
      modal,
      openScanner: () => setModal({ kind: "scanner" }),
      openEntry: () => setModal({ kind: "entry" }),
      openWallets: () => setModal({ kind: "wallets" }),
      openDetail: (id: string) => setModal({ kind: "detail", id }),
      openCommand: () => setModal({ kind: "command" }),
      close,
      receiptUrl,
      openReceipt: (url: string) => setReceiptUrl(url),
      closeReceipt: () => setReceiptUrl(null),
    }),
    [modal, close, receiptUrl]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppActions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppActions must be used inside AppActionsProvider");
  return ctx;
}
