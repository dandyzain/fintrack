import { PeriodQuerySchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parse, searchParams } from "@/lib/server/http";
import { monthlyAnalytics } from "@/lib/server/services/analytics";

export const dynamic = "force-dynamic";

export const GET = withUser(async (request, { user }) => {
  const now = new Date();
  const params = searchParams(request);
  const { month, year } = parse(PeriodQuerySchema, {
    month: params.month ?? now.getUTCMonth() + 1,
    year: params.year ?? now.getUTCFullYear(),
  });
  return ok(await monthlyAnalytics(user.id, month, year));
});
