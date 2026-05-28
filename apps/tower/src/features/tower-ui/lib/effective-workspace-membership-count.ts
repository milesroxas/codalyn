/** Prefer live org list over stale SSR membership counts when the client has loaded organizations. */
export function effectiveWorkspaceMembershipCount(
  serverMembershipCount: number,
  clientOrgCount: number | undefined,
  clientOrgsPending: boolean
): number {
  if (clientOrgsPending) {
    return serverMembershipCount;
  }
  return Math.max(serverMembershipCount, clientOrgCount ?? 0);
}
