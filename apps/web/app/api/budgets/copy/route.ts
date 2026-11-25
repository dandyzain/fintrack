import { CopyBudgetsSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parseBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Copies one month's budgets into another month (existing budgets there are kept). */
export const POST = withUser(async (request, { user }) => {
  const { from, to } = await parseBody(request, CopyBudgetsSchema);
  const copied = await getStore().copyBudgets(user.id, from, to);
  return ok({ copied }, { message: `${copied} anggaran disalin.` });
});
