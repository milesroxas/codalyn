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
  tier: "free" | "pro";
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
};

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
};
