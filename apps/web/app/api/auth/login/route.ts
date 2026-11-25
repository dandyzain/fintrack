import { LoginSchema } from "@fintrack/shared";
import { sessionResponse, withErrors } from "@/lib/server/auth";
import { clientIp, parseBody } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { authenticate } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

export const POST = withErrors(async (request) => {
  const input = await parseBody(request, LoginSchema);
  // Per-IP and per-account limits stop password guessing (including slow, distributed guessing of one account).
  await enforceRateLimit("loginIp", clientIp(request));
  await enforceRateLimit("loginEmail", input.email);
  const user = await authenticate(input.email, input.password);
  return sessionResponse(user, { message: "Login berhasil. Selamat datang kembali!" });
});
