import { DeleteWalletModeEnum } from "@fintrack/shared";
import { badRequest } from "@/lib/server/errors";
import { ok } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import type { WalletDeleteMode } from "@/lib/server/store/types";

/**
 * A pocket that still has transactions is never wiped silently:
 * - no `mode`         → 409 if it has transactions
 * - `mode=move&targetId=…` → history and remaining balance move to another pocket
 * - `mode=delete-all` → transactions are deleted too (other pockets' transfer sides are reverted)
 */
export async function deleteWalletRequest(request: Request, userId: string, id: string) {
  const params = new URL(request.url).searchParams;
  const rawMode = params.get("mode");
  let mode: WalletDeleteMode = { kind: "empty" };
  if (rawMode) {
    const parsed = DeleteWalletModeEnum.safeParse(rawMode);
    if (!parsed.success) throw badRequest("Mode penghapusan tidak dikenal.");
    if (parsed.data === "move") {
      const targetId = params.get("targetId");
      if (!targetId) throw badRequest("Pilih kantong tujuan untuk memindahkan transaksi.");
      mode = { kind: "move", targetId };
    } else {
      mode = { kind: "delete-all" };
    }
  }
  await getStore().deleteWallet(userId, id, mode);
  return ok(null, { message: "Kantong berhasil dihapus." });
}
