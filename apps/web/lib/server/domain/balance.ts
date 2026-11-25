import type { TransactionType } from "@fintrack/shared";

/**
 * The single rule for how a transaction moves pocket balances. Both stores
 * apply these deltas with atomic increments, so concurrent writes can never
 * overwrite each other's balance changes.
 */
export interface BalanceSubject {
  type: TransactionType;
  amount: number;
  walletId: string;
  toWalletId: string | null;
}

export type BalanceDeltas = Map<string, number>;

const round2 = (n: number) => Math.round(n * 100) / 100;

function add(map: BalanceDeltas, walletId: string, delta: number) {
  map.set(walletId, round2((map.get(walletId) ?? 0) + delta));
}

export function balanceEffects(tx: BalanceSubject): BalanceDeltas {
  const map: BalanceDeltas = new Map();
  if (tx.type === "EXPENSE") add(map, tx.walletId, -tx.amount);
  else if (tx.type === "INCOME") add(map, tx.walletId, tx.amount);
  else {
    if (!tx.toWalletId) throw new Error("TRANSFER requires toWalletId");
    add(map, tx.walletId, -tx.amount);
    add(map, tx.toWalletId, tx.amount);
  }
  return map;
}

/** Net change needed to go from `before` to `after` (zero entries dropped). */
export function balanceDiff(before: BalanceSubject | null, after: BalanceSubject | null): BalanceDeltas {
  const out: BalanceDeltas = new Map();
  if (after) for (const [w, d] of Array.from(balanceEffects(after))) add(out, w, d);
  if (before) for (const [w, d] of Array.from(balanceEffects(before))) add(out, w, -d);
  for (const [w, d] of Array.from(out)) if (d === 0) out.delete(w);
  return out;
}

/** Reverses a transaction's effect (used when it is deleted). */
export function revertEffects(tx: BalanceSubject): BalanceDeltas {
  return balanceDiff(tx, null);
}
