import { ForgotPasswordSchema } from "@fintrack/shared";
import { withErrors } from "@/lib/server/auth";
import { clientIp, ok, parseBody } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requestPasswordReset } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

export const POST = withErrors(async (request) => {
  await enforceRateLimit("forgotIp", clientIp(request));
  const { email } = await parseBody(request, ForgotPasswordSchema);
  await enforceRateLimit("forgotEmail", email);
  await requestPasswordReset(email, request.url);
  // Same answer whether or not the account exists.
  return ok(null, { message: "Jika email terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim." });
});
