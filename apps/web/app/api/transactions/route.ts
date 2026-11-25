import { CreateTransactionSchema, TransactionQuerySchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parse, parseBody, searchParams } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { listTransactions, serializeTransactions, toTransactionInput } from "@/lib/server/services/transactions";

export const dynamic = "force-dynamic";

export const GET = withUser(async (request, { user }) => {
  const query = parse(TransactionQuerySchema, searchParams(request));
  return ok(await listTransactions(user.id, query));
});

export const POST = withUser(async (request, { user }) => {
  const input = await parseBody(request, CreateTransactionSchema);
  const created = await getStore().createTransaction(user.id, toTransactionInput(input, user.id));
  const [data] = await serializeTransactions([created]);
  return ok(data, { status: 201, message: "Transaksi berhasil dicatat dan saldo kantong diperbarui." });
});
