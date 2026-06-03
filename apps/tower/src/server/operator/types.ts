export type OperatorPlatformMeteringConfig = {
  globalMeteringEnabled: boolean;
  envEmergencyMeteringDisabled: boolean;
  free: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
  pro: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
  studio: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
  team: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
  updatedAt: string | null;
};

export type OperatorPlatformMeteringPatch = {
  globalMeteringEnabled?: boolean;
  free?: {
    webflowProxyRequestsPerMonth?: number;
    cmsWritesPerMonth?: number;
    imageOptimizesPerMonth?: number;
  };
  pro?: {
    webflowProxyRequestsPerMonth?: number;
    cmsWritesPerMonth?: number;
    imageOptimizesPerMonth?: number;
  };
  studio?: {
    webflowProxyRequestsPerMonth?: number;
    cmsWritesPerMonth?: number;
    imageOptimizesPerMonth?: number;
  };
  team?: {
    webflowProxyRequestsPerMonth?: number;
    cmsWritesPerMonth?: number;
    imageOptimizesPerMonth?: number;
  };
};

export type OperatorMetrics = {
  totals: {
    users: number;
    productAdmins: number;
    eligibleForWorkspace: number;
    banned: number;
    workspaces: number;
    pendingInvitations: number;
    pendingEarlyAccessRequests: number;
    pendingSupportRequests: number;
    webflowConnected: number;
  };
  activity: {
    activeSessions: number;
    signupsLast7d: number;
    signupsLast30d: number;
    workspacesLast30d: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string | null;
    createdAt: string;
  }>;
  recentWorkspaces: Array<{
    id: string;
    name: string;
    slug: string;
    memberCount: number;
    createdAt: string;
  }>;
};

export type OperatorUsageLimitsPatch = {
  meteringEnabled?: boolean;
  webflowProxyLimitOverride?: number | null;
  cmsWriteLimitOverride?: number | null;
  imageOptimizeLimitOverride?: number | null;
};

export type OperatorUsageLimitsView = {
  scope: "user" | "workspace";
  tier: "free" | "pro" | "studio" | "team";
  meteringEnabled: boolean;
  globalMeteringDisabled: boolean;
  webflowProxyLimitOverride: number | null;
  cmsWriteLimitOverride: number | null;
  imageOptimizeLimitOverride: number | null;
  yearMonth: string;
  webflowProxyRequestCount: number;
  cmsWriteCount: number;
  imageOptimizeCount: number;
  effectiveWebflowProxyLimit: number | null;
  effectiveCmsWriteLimit: number | null;
  effectiveImageLimit: number | null;
  memberWebflowProxyRequestCount?: number;
  memberCmsWriteCount?: number;
  memberImageOptimizeCount?: number;
};

/** Meter counts shared by every usage-metrics shape (one calendar month, UTC). */
export type OperatorUsageMeterTotals = {
  webflowProxyRequestCount: number;
  cmsWriteCount: number;
  imageOptimizeCount: number;
};

/** A single month in a usage time series (platform-wide or per entity). */
export type OperatorUsageTrendPoint = OperatorUsageMeterTotals & {
  yearMonth: string;
};

/** Estimated infra cost (USD) attributable to each meter for one month / entity. */
export type OperatorUsageMeterCost = {
  webflowProxy: number;
  cmsWrite: number;
  image: number;
};

/** A single month of estimated infra cost per meter (platform-wide). */
export type OperatorUsageCostTrendPoint = OperatorUsageMeterCost & {
  yearMonth: string;
};

/** Current-month estimated cost split by where it is metered: per individual vs pooled across a workspace. */
export type OperatorUsageCostSegment = OperatorUsageMeterCost & {
  segment: "individual" | "workspace";
};

/** A top consumer (individual user or pooled workspace) for the current month. */
export type OperatorUsageConsumer = OperatorUsageMeterTotals & {
  id: string;
  scope: "user" | "workspace";
  label: string;
  sublabel: string;
  total: number;
  /** Estimated infra cost (USD) per meter for this consumer this month. */
  cost: OperatorUsageMeterCost;
};

/** Current-month usage split by where it is metered: per individual vs pooled across a workspace. */
export type OperatorUsageSegmentTotals = OperatorUsageMeterTotals & {
  segment: "individual" | "workspace";
};

/** Aggregate used vs effective cap for one meter across all metered entities consuming this month. */
export type OperatorUsageUtilizationMeter = {
  kind: "webflowProxy" | "cmsWrite" | "image";
  used: number;
  limit: number;
  meteredEntityCount: number;
};

export type OperatorUsageMetrics = {
  yearMonth: string;
  currentMonthTotals: OperatorUsageMeterTotals;
  /** Estimated infra cost (USD) per meter for the current month, platform-wide. */
  currentMonthCost: OperatorUsageMeterCost;
  designerApiBreakdown: { cmsSlots: number; imageUploadCms: number };
  trend: OperatorUsageTrendPoint[];
  /** Estimated infra cost (USD) per meter over the same window as `trend`. */
  costTrend: OperatorUsageCostTrendPoint[];
  segments: OperatorUsageSegmentTotals[];
  /** Current-month estimated cost split individual vs pooled workspace. */
  costSegments: OperatorUsageCostSegment[];
  topConsumers: OperatorUsageConsumer[];
  utilization: OperatorUsageUtilizationMeter[];
};

export type OperatorUserRow = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  canCreateOrganization: boolean;
  webflowConnected: boolean;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingManagedByStripe: boolean;
  hasStripePro: boolean;
  memberships: number;
  usage: OperatorUsageLimitsView;
  createdAt: string;
  updatedAt: string;
};

export type OperatorUserListResponse = {
  rows: OperatorUserRow[];
  total: number;
  limit: number;
  offset: number;
};

export type OperatorUserMembership = {
  memberId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  createdAt: string;
};

export type OperatorUserSession = {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type OperatorUserDetail = OperatorUserRow & {
  image: string | null;
  webflowAuthorizedUserId: string | null;
  memberOf: OperatorUserMembership[];
  activeSessions: OperatorUserSession[];
  usageTrend: OperatorUsageTrendPoint[];
};

export type OperatorWorkspaceBillingMode = "free" | "stripe_team" | "legacy_paid";

export type OperatorWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  seatLimit: number | null;
  effectiveSeatLimit: number;
  isAtSeatCap: boolean;
  isOverSeatCap: boolean;
  billingPlan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingMode: OperatorWorkspaceBillingMode;
  billingManagedByStripe: boolean;
  isProEntitled: boolean;
  displayBillingPlan: string | null;
  planLabel: string;
  canOperatorEditBilling: boolean;
  canOperatorEditSeatLimit: boolean;
  operatorSeatLimitOverride: boolean;
  stripeSeatQuantity: number | null;
  memberCount: number;
  pendingInvitations: number;
  usage: OperatorUsageLimitsView;
  createdAt: string;
};

export type OperatorWorkspaceListResponse = {
  rows: OperatorWorkspaceRow[];
  total: number;
  limit: number;
  offset: number;
};

export type OperatorWorkspaceMember = {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  beaconRestrictToEditorExperience: boolean;
  createdAt: string;
};

export type OperatorWorkspaceInvitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviterEmail: string | null;
};

export type OperatorWorkspaceDetail = OperatorWorkspaceRow & {
  metadata: string | null;
  members: OperatorWorkspaceMember[];
  invitations: OperatorWorkspaceInvitation[];
  usageTrend: OperatorUsageTrendPoint[];
};

export type OperatorUserPatch = OperatorUsageLimitsPatch & {
  role?: "user" | "product_admin" | null;
  canCreateOrganization?: boolean;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: string | null;
};

export type OperatorWorkspacePatch = OperatorUsageLimitsPatch & {
  name?: string;
  slug?: string;
  seatLimit?: number | null;
  billingPlan?: string | null;
  subscriptionStatus?: string | null;
  operatorSeatLimitOverride?: boolean;
  clearOperatorSeatOverride?: boolean;
};
