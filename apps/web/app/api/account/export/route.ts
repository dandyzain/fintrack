import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/auth";
import { exportAccount } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

/** Downloads every piece of data stored for the account as JSON. */
export const GET = withUser(async (_request, { user }) => {
  const data = await exportAccount(user);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fintrack-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
