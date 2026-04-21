import { sql } from "drizzle-orm";
import { parseProductAdminEmailsNormalized } from "@/server/membership/product-admin-env";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

/**
 * Sets `user.role` to `product_admin` for every email in `TOWER_PRODUCT_ADMIN_EMAILS`.
 * Runs on server startup (see `src/instrumentation.ts`). Users must exist in the DB first.
 */
export async function syncProductAdminRolesFromEnv(): Promise<void> {
  const emails = parseProductAdminEmailsNormalized();
  if (emails.length === 0) {
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("placeholder")) {
    return;
  }
  for (const email of emails) {
    await db.update(user).set({ role: "product_admin" }).where(sql`lower(${user.email}) = ${email}`);
  }
}
