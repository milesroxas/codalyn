"use client";

import { useMemo } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import {
  filterActiveTowerOrganizations,
  resolveActiveTowerOrganization,
} from "@/shared/lib/membership/filter-active-tower-organizations";

/**
 * Better Auth organization list/active hooks with soft-deleted workspaces removed for UI.
 * Authorization and active-org resolution on the server use `resolveActiveOrganizationId` and
 * `userHasActiveMembershipInOrganization` — do not rely on this hook alone for access control.
 */
export function useActiveTowerOrganizations() {
  const listQuery = authClient.useListOrganizations();
  const activeQuery = authClient.useActiveOrganization();

  const orgs = useMemo(() => filterActiveTowerOrganizations(listQuery.data), [listQuery.data]);
  const activeOrg = useMemo(() => resolveActiveTowerOrganization(activeQuery.data), [activeQuery.data]);

  return {
    orgs,
    activeOrg,
    orgsPending: listQuery.isPending,
    activeOrgPending: activeQuery.isPending,
    refetchOrgs: listQuery.refetch,
    refetchActiveOrg: activeQuery.refetch,
  };
}
