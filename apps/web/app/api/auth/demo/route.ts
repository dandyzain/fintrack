import { sessionResponse, withErrors } from "@/lib/server/auth";
import { clientIp } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { createDemoSandbox } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

/** Creates a private, throw-away demo account with sample data (expires after 24 hours). */
export const POST = withErrors(async (request) => {
  await enforceRateLimit("demo", clientIp(request));
  const user = await createDemoSandbox();
  return sessionResponse(user, { status: 201, message: "Akun demo siap. Data akan dihapus otomatis setelah 24 jam." });
});
