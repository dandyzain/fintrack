import { toAuthUser, withUser } from "@/lib/server/auth";
import { storageMode } from "@/lib/server/config";
import { ok } from "@/lib/server/http";
import { isEmailConfigured } from "@/lib/server/mailer";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user }) =>
  ok({
    user: toAuthUser(user),
    /** "memory" means data is not persisted (no DATABASE_URL); the UI shows a notice. */
    storage: storageMode(),
    emailDelivery: isEmailConfigured(),
  })
);
