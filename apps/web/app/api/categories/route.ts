import { CreateCategorySchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { ok, parseBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user }) => ok(await getStore().listCategories(user.id)));

export const POST = withUser(async (request, { user }) => {
  const input = await parseBody(request, CreateCategorySchema);
  return ok(await getStore().createCategory(user.id, input), { status: 201, message: "Kategori berhasil dibuat." });
});
