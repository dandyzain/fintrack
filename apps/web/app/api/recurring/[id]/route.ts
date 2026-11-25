import { UpdateRecurringSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parseBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { updateRecurring } from "@/lib/server/services/recurring";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** Pause/resume (`active`) or edit amount, notes, category or end date. */
export const PATCH = withUser<Params>(async (request, { user, params }) => {
  const input = await parseBody(request, UpdateRecurringSchema);
  return ok(await updateRecurring(user.id, params.id, input), { message: "Transaksi berulang diperbarui." });
});

/** Stops the schedule. Transactions it already created stay in the ledger. */
export const DELETE = withUser<Params>(async (_request, { user, params }) => {
  await getStore().deleteRecurring(user.id, params.id);
  return ok(null, { message: "Transaksi berulang dihapus." });
});
