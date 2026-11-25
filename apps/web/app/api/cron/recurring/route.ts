import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ok } from "@/lib/server/http";
import { processDueRecurring } from "@/lib/server/services/recurring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily job (see vercel.json "crons") that creates due recurring transactions
 * for everyone, so they appear even for users who don't open the app.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const valid =
    Boolean(secret) && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!valid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const created = await processDueRecurring(null);
  return ok({ created });
}
