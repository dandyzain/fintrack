import { CreateWalletSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { badRequest } from "@/lib/server/errors";
import { ok, parseBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { deleteWalletRequest } from "./delete";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user }) => ok(await getStore().listWallets(user.id)));

export const POST = withUser(async (request, { user }) => {
  const input = await parseBody(request, CreateWalletSchema);
  const wallet = await getStore().createWallet(user.id, input);
  return ok(wallet, { status: 201, message: "Kantong berhasil dibuat." });
});

/** Legacy form used by the mobile app: DELETE /api/wallets?id=… (same rules as /api/wallets/[id]). */
export const DELETE = withUser(async (request, { user }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw badRequest("ID kantong wajib disertakan.");
  return deleteWalletRequest(request, user.id, id);
});
