import { VerifyEmailSchema } from "@fintrack/shared";
import { toAuthUser, withErrors } from "@/lib/server/auth";
import { clientIp, ok, parseBody } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { verifyEmail } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

export const POST = withErrors(async (request) => {
  await enforceRateLimit("forgotIp", clientIp(request));
  const { token } = await parseBody(request, VerifyEmailSchema);
  const user = await verifyEmail(token);
  return ok({ user: toAuthUser(user) }, { message: "Email berhasil diverifikasi." });
});
