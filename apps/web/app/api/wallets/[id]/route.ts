import { UpdateWalletSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { notFound } from "@/lib/server/errors";
import { ok, parseBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { deleteWalletRequest } from "../delete";

export const dynamic = "force-dynamic";

type Params = { id: string };

export const GET = withUser<Params>(async (_request, { user, params }) => {
  const wallet = await getStore().getWallet(user.id, params.id);
  if (!wallet) throw notFound("Kantong tidak ditemukan.");
  return ok(wallet);
});

/** Rename a pocket and/or correct its balance. */
export const PATCH = withUser<Params>(async (request, { user, params }) => {
  const input = await parseBody(request, UpdateWalletSchema);
  return ok(await getStore().updateWallet(user.id, params.id, input), { message: "Kantong berhasil diperbarui." });
});

export const DELETE = withUser<Params>(async (request, { user, params }) => deleteWalletRequest(request, user.id, params.id));
