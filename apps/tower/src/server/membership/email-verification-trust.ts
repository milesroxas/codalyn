import { eq, sql } from "drizzle-orm";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export async function markEmailVerifiedForUserId(userId: string): Promise<void> {
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));
}

export async function markEmailVerifiedForEmail(email: string): Promise<void> {
  const normalized = normalizeAccessEmail(email);
  await db.update(user).set({ emailVerified: true }).where(sql`lower(${user.email}) = ${normalized}`);
}
