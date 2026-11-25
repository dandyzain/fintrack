import { withUser } from "@/lib/server/auth";
import { ok } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const DELETE = withUser<{ id: string }>(async (_request, { user, params }) => {
  await getStore().deleteBudget(user.id, params.id);
  return ok(null, { message: "Anggaran dihapus." });
});
