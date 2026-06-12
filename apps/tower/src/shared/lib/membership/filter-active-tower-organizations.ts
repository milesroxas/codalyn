/**
 * Runtime filter for Better Auth organization rows (includes `deletedAt` from tower org schema).
 * Server routes must enforce separately via `activeOrganizationCondition()` / `resolveActiveOrganizationId`.
 */
export type TowerOrganizationListRow = {
  id: string;
  deletedAt?: Date | string | null;
};

export function isActiveTowerOrganization(org: TowerOrganizationListRow): boolean {
  return org.deletedAt == null;
}

export function filterActiveTowerOrganizations<T extends TowerOrganizationListRow>(
  orgs: readonly T[] | null | undefined
): T[] {
  if (!orgs) {
    return [];
  }
  return orgs.filter(isActiveTowerOrganization);
}

export function resolveActiveTowerOrganization<T extends TowerOrganizationListRow>(
  org: T | null | undefined
): T | null {
  if (!org || !isActiveTowerOrganization(org)) {
    return null;
  }
  return org;
}
