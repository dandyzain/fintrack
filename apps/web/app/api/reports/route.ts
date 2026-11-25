import { z } from "zod";
import { PeriodQuerySchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parse, searchParams } from "@/lib/server/http";
import { report } from "@/lib/server/services/analytics";

export const dynamic = "force-dynamic";

const ReportQuery = PeriodQuerySchema.extend({ months: z.coerce.number().int().min(3).max(24).default(12) });

/** Month-by-month income/spending and category trends, ending at month/year (default: this month). */
export const GET = withUser(async (request, { user }) => {
  const now = new Date();
  const params = searchParams(request);
  const q = parse(ReportQuery, {
    month: params.month ?? now.getUTCMonth() + 1,
    year: params.year ?? now.getUTCFullYear(),
    months: params.months,
  });
  return ok(await report(user.id, q.month, q.year, q.months));
});
