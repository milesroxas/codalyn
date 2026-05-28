import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { account } from "@/shared/lib/db/auth-schema";

export class ActorPasswordVerificationError extends Error {
  readonly code = "invalid_password";

  constructor() {
    super("Password is incorrect.");
    this.name = "ActorPasswordVerificationError";
  }
}

/** Verifies the actor's email/password credentials before destructive actions. */
export async function assertActorPassword(userId: string, password: string): Promise<void> {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new ActorPasswordVerificationError();
  }

  const [credential] = await db
    .select({ password: account.password })
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1);

  if (!credential?.password) {
    throw new ActorPasswordVerificationError();
  }

  const valid = await verifyPassword({ hash: credential.password, password: trimmed });
  if (!valid) {
    throw new ActorPasswordVerificationError();
  }
}
