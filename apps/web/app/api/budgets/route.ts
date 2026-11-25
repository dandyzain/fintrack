import { PeriodQuerySchema, UpsertBudgetSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parse, parseBody, searchParams } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = withUser(async (request, { user }) => {
  const now = new Date();
  const params = searchParams(request);
  const { month, year } = parse(PeriodQuerySchema, {
    month: params.month ?? now.getUTCMonth() + 1,
    year: params.year ?? now.getUTCFullYear(),
  });
  return ok(await getStore().listBudgets(user.id, month, year));
});

/** Creates or updates the budget of one category for one month. */
export const PUT = withUser(async (request, { user }) => {
  const input = await parseBody(request, UpsertBudgetSchema);
  return ok(await getStore().upsertBudget(user.id, input), { message: "Anggaran disimpan." });
});
