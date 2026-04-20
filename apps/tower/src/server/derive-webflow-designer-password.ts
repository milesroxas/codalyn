import { createHmac } from "node:crypto";
import { resolveAuthSecret } from "@/server/auth-secret";

/** Deterministic password for Better Auth credential rows created/linked from Webflow Designer ID tokens (server-only). */
export function deriveWebflowDesignerCredentialPassword(webflowAuthorizedUserId: string): string {
  const secret = resolveAuthSecret();
  return createHmac("sha256", secret).update(`codalyn:webflow-designer:${webflowAuthorizedUserId}`).digest("base64url");
}
