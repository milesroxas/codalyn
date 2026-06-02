/**
 * Canonical product-plan contract shared by Tower and Beacon.
 *
 * Plan keys are 1:1 with usage cap tiers. This catalog is the single source of truth for
 * marketing names, billing scope, and seat model. Monthly caps live in Tower's operator-managed
 * limits snapshot (not here), so caps stay overridable without changing the shared contract.
 */
export const TOWER_PLAN_KEYS = ["free", "pro", "studio", "team"] as const;

export type TowerPlanKey = (typeof TOWER_PLAN_KEYS)[number];

/** Whether a plan is billed to an individual user or to a workspace (per-seat). */
export type TowerPlanBillingScope = "user" | "workspace";

/** `single` = one included seat; `per_seat` = seats billed per member (workspace plans). */
export type TowerPlanSeatModel = "single" | "per_seat";

/**
 * Default minimum billable seats for the per-seat Team plan. Tower may override at runtime via
 * `TOWER_TEAM_MIN_SEATS`; this constant is the shared fallback so the contract has a single source.
 */
export const TOWER_TEAM_DEFAULT_SEAT_MINIMUM = 6;

export type TowerPlanDefinition = {
  key: TowerPlanKey;
  /** Customer-facing marketing name. */
  name: string;
  billingScope: TowerPlanBillingScope;
  seatModel: TowerPlanSeatModel;
  /** True for paid upgrade targets (drives upgrade CTAs and "Account" badges). */
  isPaid: boolean;
  /**
   * Workspaces a user on this **individual** plan may own/admin (Free/Pro/Studio). Team is per-workspace
   * billing — it grants the single paid workspace it is attached to, not a global "more workspaces"
   * entitlement, so its value is 1 and workspace-creation allowance is always resolved from the user's
   * individual plan.
   */
  ownedWorkspaceAllowance: number;
  /** True when monthly usage is pooled across the workspace (per-seat cap × paid seats) instead of per user. */
  pooledUsage: boolean;
  /** Seats included in the base plan price. */
  includedSeats: number;
  /** Minimum billable seats for per-seat plans; null for single-seat individual plans. */
  seatMinimum: number | null;
};

export const TOWER_PLAN_CATALOG: Record<TowerPlanKey, TowerPlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    billingScope: "user",
    seatModel: "single",
    isPaid: false,
    ownedWorkspaceAllowance: 1,
    pooledUsage: false,
    includedSeats: 1,
    seatMinimum: null,
  },
  pro: {
    key: "pro",
    name: "Pro",
    billingScope: "user",
    seatModel: "single",
    isPaid: true,
    ownedWorkspaceAllowance: 3,
    pooledUsage: false,
    includedSeats: 1,
    seatMinimum: null,
  },
  studio: {
    key: "studio",
    name: "Studio",
    billingScope: "user",
    seatModel: "single",
    isPaid: true,
    ownedWorkspaceAllowance: 10,
    pooledUsage: false,
    includedSeats: 1,
    seatMinimum: null,
  },
  team: {
    key: "team",
    name: "Team",
    billingScope: "workspace",
    seatModel: "per_seat",
    isPaid: true,
    ownedWorkspaceAllowance: 1,
    pooledUsage: true,
    includedSeats: TOWER_TEAM_DEFAULT_SEAT_MINIMUM,
    seatMinimum: TOWER_TEAM_DEFAULT_SEAT_MINIMUM,
  },
};

/** Individual plans (Free/Pro/Studio) whose owned-workspace allowance gates workspace creation. */
export type TowerIndividualPlanKey = "free" | "pro" | "studio";

/** Owned/admin workspace allowance for a user's individual plan. Team membership never raises this. */
export function towerIndividualOwnedWorkspaceAllowance(plan: TowerIndividualPlanKey): number {
  return TOWER_PLAN_CATALOG[plan].ownedWorkspaceAllowance;
}

/** Whether a plan's monthly usage is pooled across the workspace rather than scoped to each user. */
export function towerPlanUsesPooledUsage(key: TowerPlanKey): boolean {
  return TOWER_PLAN_CATALOG[key].pooledUsage;
}

export function towerPlanDefinition(key: TowerPlanKey): TowerPlanDefinition {
  return TOWER_PLAN_CATALOG[key];
}

export function towerPlanName(key: TowerPlanKey): string {
  return TOWER_PLAN_CATALOG[key].name;
}

export function towerPlanBillingScope(key: TowerPlanKey): TowerPlanBillingScope {
  return TOWER_PLAN_CATALOG[key].billingScope;
}

export function isTowerPlanKey(raw: unknown): raw is TowerPlanKey {
  return typeof raw === "string" && (TOWER_PLAN_KEYS as readonly string[]).includes(raw);
}

/** Runtime-safe plan key parse for untrusted payloads. Returns null for unknown values. */
export function normalizeTowerPlanKey(raw: unknown): TowerPlanKey | null {
  return isTowerPlanKey(raw) ? raw : null;
}
