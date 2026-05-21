import { adminClient, inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/server/auth";
import {
  towerOrganizationAc,
  towerOrganizationClientSchema,
  towerOrganizationRoles,
} from "@/shared/lib/membership/tower-organization-access";

function resolveAuthClientBaseUrl(): string {
  // Prefer the live page origin so apex→www redirects (e.g. codalyn.app → www.codalyn.app) do not
  // break Better Auth fetches when NEXT_PUBLIC_APP_URL still points at the apex host.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export const authClient = createAuthClient({
  baseURL: resolveAuthClientBaseUrl(),
  plugins: [
    inferAdditionalFields<typeof auth>(),
    organizationClient({
      ac: towerOrganizationAc,
      roles: towerOrganizationRoles,
      schema: towerOrganizationClientSchema,
    }),
    adminClient(),
  ],
});
