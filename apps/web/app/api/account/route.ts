import { DeleteAccountSchema, UpdateProfileSchema } from "@fintrack/shared";
import { clearSession, toAuthUser, withUser } from "@/lib/server/auth";
import { ok, parseBody } from "@/lib/server/http";
import { deleteAccount, updateProfile } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user }) => ok({ user: toAuthUser(user) }));

export const PATCH = withUser(async (request, { user }) => {
  const input = await parseBody(request, UpdateProfileSchema);
  const updated = await updateProfile(user, input, request.url);
  return ok({ user: toAuthUser(updated) }, { message: "Profil berhasil diperbarui." });
});

/** Permanently deletes the account and all of its data (and receipt images). */
export const DELETE = withUser(async (request, { user }) => {
  const { password } = await parseBody(request, DeleteAccountSchema);
  await deleteAccount(user, password);
  const response = ok(null, { message: "Akun dan seluruh data Anda telah dihapus." });
  clearSession(response);
  return response;
});
