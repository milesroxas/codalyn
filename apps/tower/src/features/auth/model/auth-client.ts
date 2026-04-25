import { adminClient, inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/server/auth";
import {
  towerOrganizationAc,
  towerOrganizationClientSchema,
  towerOrganizationRoles,
} from "@/shared/lib/membership/tower-organization-access";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
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
