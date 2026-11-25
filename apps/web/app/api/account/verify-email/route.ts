import { withUser } from "@/lib/server/auth";
import { badRequest } from "@/lib/server/errors";
import { ok } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { sendVerificationEmail } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

/** Sends a new verification email. */
export const POST = withUser(async (request, { user }) => {
  if (user.emailVerifiedAt) throw badRequest("Email Anda sudah terverifikasi.");
  await enforceRateLimit("verifyResend", user.id);
  const { sent } = await sendVerificationEmail(user, request.url);
  return ok({ sent }, { message: sent ? "Email verifikasi telah dikirim." : "Pengiriman email belum dikonfigurasi di server ini." });
});
