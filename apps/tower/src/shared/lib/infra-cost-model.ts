/**
 * Estimated infrastructure cost model — single source of truth for converting the measured cost drivers
 * we meter (active compute milliseconds + egress bytes) into approximate Vercel spend. The operator
 * console uses this to reason about pricing and profitability: what does it actually cost us to serve
 * each meter, and which accounts are expensive?
 *
 * Cost is derived from real measurements (not assumptions): `recordMeterCost` accumulates active compute
 * ms and egress bytes per meter, and this module prices them with the published rate anchors below. Tune
 * by editing `RATE_ANCHORS` when a provider changes pricing.
 */

/**
 * Published Vercel on-demand rate anchors (USD), captured June 2026. We price the two request-attributable
 * drivers we can measure: active compute (CPU + memory while running) and Fast Data Transfer (egress).
 * Fixed per-invocation overhead and Neon compute/storage are platform costs not attributed per request.
 * - Active CPU $0.128/CPU-hr, memory $0.0106/GB-hr (default function = 2 GB / 1 vCPU). https://vercel.com/pricing
 * - Fast Data Transfer $0.15/GB.
 * - Neon (Launch) compute $0.106/CU-hr, storage $0.35/GB-month — shown for reference only. https://neon.com/pricing
 */
export const RATE_ANCHORS = {
  vercelActiveCpuUsdPerHour: 0.128,
  vercelMemoryUsdPerGbHour: 0.0106,
  vercelDefaultFunctionMemoryGb: 2,
  vercelFastDataTransferUsdPerGb: 0.15,
  neonComputeUsdPerCuHour: 0.106,
  neonStorageUsdPerGbMonth: 0.35,
} as const;

/** Combined Vercel active compute (CPU + default-size memory) per active second at 2 GB / 1 vCPU. */
const VERCEL_COMPUTE_USD_PER_SECOND =
  RATE_ANCHORS.vercelActiveCpuUsdPerHour / 3600 +
  (RATE_ANCHORS.vercelMemoryUsdPerGbHour * RATE_ANCHORS.vercelDefaultFunctionMemoryGb) / 3600;

const BYTES_PER_GB = 1_000_000_000;

/** Estimated USD for measured active compute (Vercel CPU + memory). */
function computeCostUsd(computeMs: number): number {
  if (!Number.isFinite(computeMs) || computeMs <= 0) {
    return 0;
  }
  return (computeMs / 1000) * VERCEL_COMPUTE_USD_PER_SECOND;
}

/** Estimated USD for measured egress (Vercel Fast Data Transfer). */
function transferCostUsd(egressBytes: number): number {
  if (!Number.isFinite(egressBytes) || egressBytes <= 0) {
    return 0;
  }
  return (egressBytes / BYTES_PER_GB) * RATE_ANCHORS.vercelFastDataTransferUsdPerGb;
}

/** Total estimated infra cost (USD) for one meter's measured drivers. */
export function meterCostUsd(computeMs: number, egressBytes: number): number {
  return computeCostUsd(computeMs) + transferCostUsd(egressBytes);
}

const usdStandard = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdPrecise = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const usdCompact = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Human-readable USD; sub-dollar values keep up to 4 decimals so small unit costs stay legible. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return usdStandard.format(0);
  }
  if (value !== 0 && Math.abs(value) < 1) {
    return usdPrecise.format(value);
  }
  return usdStandard.format(value);
}

/** Compact USD for chart axes (e.g. `$1.2K`). */
export function formatUsdCompact(value: number): string {
  return usdCompact.format(Number.isFinite(value) ? value : 0);
}
