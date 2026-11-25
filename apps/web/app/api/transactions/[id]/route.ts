import { UpdateTransactionSchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { notFound } from "@/lib/server/errors";
import { ok, parse, readJson } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { deleteTransaction, serializeTransactions, toTransactionPatch } from "@/lib/server/services/transactions";

export const dynamic = "force-dynamic";

type Params = { id: string };

export const GET = withUser<Params>(async (_request, { user, params }) => {
  const tx = await getStore().getTransaction(user.id, params.id);
  if (!tx) throw notFound("Transaksi tidak ditemukan.");
  const [data] = await serializeTransactions([tx]);
  return ok(data);
});

const update = withUser<Params>(async (request, { user, params }) => {
  const body = (await readJson(request)) as Record<string, unknown>;
  const input = parse(UpdateTransactionSchema, { ...body, id: params.id });
  const updated = await getStore().updateTransaction(user.id, params.id, toTransactionPatch(input, user.id));
  const [data] = await serializeTransactions([updated]);
  return ok(data, { message: "Transaksi berhasil diperbarui dan saldo kantong disesuaikan." });
});

export const PUT = update;
export const PATCH = update;

export const DELETE = withUser<Params>(async (_request, { user, params }) =>
  ok(await deleteTransaction(user.id, params.id), { message: "Transaksi dihapus dan saldo kantong dikembalikan." })
);
