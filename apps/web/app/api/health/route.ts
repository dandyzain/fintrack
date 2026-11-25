import { NextResponse } from "next/server";
import { prisma } from "@fintrack/database";
import { isDatabaseMode, storageMode } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/** Uptime check: 200 when the app (and its database, if configured) is reachable. */
export async function GET() {
  if (!isDatabaseMode()) return NextResponse.json({ status: "ok", storage: storageMode() });
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", storage: "database" });
  } catch {
    return NextResponse.json({ status: "degraded", storage: "database", database: "unreachable" }, { status: 503 });
  }
}
