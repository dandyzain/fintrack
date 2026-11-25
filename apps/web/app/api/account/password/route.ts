import { ChangePasswordSchema } from "@fintrack/shared";
import { sessionResponse, withUser } from "@/lib/server/auth";
import { parseBody } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { changePassword } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

/** Changes the password, signs out every other session and keeps this one signed in. */
export const POST = withUser(async (request, { user }) => {
  await enforceRateLimit("passwordChange", user.id);
  const { currentPassword, newPassword } = await parseBody(request, ChangePasswordSchema);
  const updated = await changePassword(user, currentPassword, newPassword);
  return sessionResponse(updated, { message: "Kata sandi berhasil diganti. Perangkat lain telah dikeluarkan." });
});
