import { RegisterSchema } from "@fintrack/shared";
import { sessionResponse, withErrors } from "@/lib/server/auth";
import { clientIp, parseBody } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { registerUser } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

export const POST = withErrors(async (request) => {
  await enforceRateLimit("register", clientIp(request));
  const input = await parseBody(request, RegisterSchema);
  const user = await registerUser(input, request.url);
  return sessionResponse(user, { status: 201, message: "Pendaftaran berhasil! Selamat datang di FinTrack." });
});
