import { eq } from "drizzle-orm";
import { isWebflowOAuthAuthorizationCodeExpired } from "@/server/webflow-oauth-callback-logic";
import { db } from "@/shared/lib/db";
import { webflowOauthInstallCode } from "@/shared/lib/db/auth-schema";

export type StagedWebflowInstallCode = {
  id: string;
  authorizationCode: string;
  redirectUri: string;
};

export async function stageWebflowInstallAuthorizationCode(input: {
  authorizationCode: string;
  redirectUri: string;
  externalState: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(webflowOauthInstallCode).values({
    id,
    authorizationCode: input.authorizationCode,
    redirectUri: input.redirectUri,
    externalState: input.externalState,
  });
  return id;
}

export async function consumeStagedWebflowInstallAuthorizationCode(
  pendingId: string
): Promise<StagedWebflowInstallCode | null> {
  const trimmedId = pendingId.trim();
  if (!trimmedId) {
    return null;
  }

  const rows = await db
    .select({
      id: webflowOauthInstallCode.id,
      authorizationCode: webflowOauthInstallCode.authorizationCode,
      redirectUri: webflowOauthInstallCode.redirectUri,
      createdAt: webflowOauthInstallCode.createdAt,
    })
    .from(webflowOauthInstallCode)
    .where(eq(webflowOauthInstallCode.id, trimmedId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  await db.delete(webflowOauthInstallCode).where(eq(webflowOauthInstallCode.id, trimmedId));

  if (isWebflowOAuthAuthorizationCodeExpired(row.createdAt)) {
    return null;
  }

  return {
    id: row.id,
    authorizationCode: row.authorizationCode,
    redirectUri: row.redirectUri,
  };
}
