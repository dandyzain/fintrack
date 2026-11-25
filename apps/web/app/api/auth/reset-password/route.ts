import { ResetPasswordSchema } from "@fintrack/shared";
import { sessionResponse, withErrors } from "@/lib/server/auth";
import { clientIp, parseBody } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { resetPassword } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

export const POST = withErrors(async (request) => {
  await enforceRateLimit("forgotIp", clientIp(request));
  const { token, password } = await parseBody(request, ResetPasswordSchema);
  const user = await resetPassword(token, password);
  return sessionResponse(user, { message: "Kata sandi berhasil diperbarui. Semua sesi lain telah dikeluarkan." });
});
