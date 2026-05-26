export const TOWER_CONNECTION_PATH = "/connection" as const;

/** Query param on the connection page for post-OAuth status toasts. */
export const TOWER_CONNECTION_STATUS_QUERY = "connection" as const;

export function towerConnectionPathWithStatus(status: string): string {
  const params = new URLSearchParams({ [TOWER_CONNECTION_STATUS_QUERY]: status });
  return `${TOWER_CONNECTION_PATH}?${params.toString()}`;
}
