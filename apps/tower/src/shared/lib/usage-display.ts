import { formatTowerUsageRatio } from "@codalyn/webflow-kit";

/** Formats monthly usage for tables and detail panels. `limit === null` means unlimited. */
export function formatUsageRatio(used: number, limit: number | null): string {
  return formatTowerUsageRatio(used, limit);
}

export function meteringStatusLabel(opts: {
  meteringEnabled: boolean;
  globalMeteringDisabled: boolean;
  tier: "free" | "pro";
}): string {
  if (opts.globalMeteringDisabled || !opts.meteringEnabled || opts.tier === "pro") {
    return "Unmetered";
  }
  return "Metered";
}
