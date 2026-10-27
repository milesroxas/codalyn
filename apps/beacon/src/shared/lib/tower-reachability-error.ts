function isTowerNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }
  const message = error.message.trim().toLowerCase();
  return message === "failed to fetch" || message.includes("networkerror");
}

export function formatTowerReachabilityError(error: unknown): string {
  if (!isTowerNetworkFetchError(error)) {
    return error instanceof Error ? error.message : "Unexpected Tower request error";
  }
  return "Could not reach Codalyn. Check your network connection and try again.";
}
