import { clearSession, getSessionUser, withErrors } from "@/lib/server/auth";
import { ok, readJson } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Signs out this browser. With `{ "everywhere": true }` it also revokes every other session. */
export const POST = withErrors(async (request) => {
  const body = (await readJson(request).catch(() => ({}))) as { everywhere?: boolean };
  if (body?.everywhere) {
    const user = await getSessionUser(request);
    if (user) await getStore().updateUser(user.id, { bumpSessionVersion: true });
  }
  const response = ok(null, { message: "Berhasil keluar dari akun." });
  clearSession(response);
  return response;
});
