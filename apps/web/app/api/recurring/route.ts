import { CreateRecurringSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parseBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { createRecurring, processDueRecurring } from "@/lib/server/services/recurring";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user }) => {
  await processDueRecurring(user.id);
  return ok(await getStore().listRecurring(user.id));
});

/** New schedule. Occurrences from the start date up to today are created right away. */
export const POST = withUser(async (request, { user }) => {
  const input = await parseBody(request, CreateRecurringSchema);
  const rule = await createRecurring(user.id, input);
  const created = await processDueRecurring(user.id);
  const fresh = (await getStore().getRecurring(user.id, rule.id)) ?? rule;
  return ok({ rule: fresh, createdTransactions: created }, { status: 201, message: "Transaksi berulang dibuat." });
});
