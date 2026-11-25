import { UpdateCategorySchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parseBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

type Params = { id: string };

export const PATCH = withUser<Params>(async (request, { user, params }) => {
  const input = await parseBody(request, UpdateCategorySchema);
  return ok(await getStore().updateCategory(user.id, params.id, input), { message: "Kategori berhasil diperbarui." });
});

/** Transactions keep existing without a category; budgets for the category are removed. */
export const DELETE = withUser<Params>(async (_request, { user, params }) => {
  await getStore().deleteCategory(user.id, params.id);
  return ok(null, { message: "Kategori berhasil dihapus." });
});
