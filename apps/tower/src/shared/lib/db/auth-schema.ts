import type { BeaconAppSettings, BeaconOrgTeamSettings } from "@codalyn/webflow-kit";
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  /** Webflow Data API `authorized_user` id from Designer `getIdToken` + `/beta/token/resolve`. */
  webflowAuthorizedUserId: text("webflow_authorized_user_id").unique(),
  /** App-wide role from Better Auth admin plugin: `user` or `product_admin`. */
  role: text("role"),
  /**
   * Operator override to create owned workspaces beyond the free-tier cap without individual Pro.
   * Does not affect the first free workspace. Set by ops or invite redemption — not by team billing or default.
   */
  canCreateOrganization: boolean("can_create_organization").default(false).notNull(),
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  /** Stripe customer for individual (non-operator) Pro checkout; optional until checkout. */
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  /**
   * User-level product: `free` (default) or `pro`. Operator-managed org billing uses `organization.billing_plan`.
   * Webhook-synced; do not set from the client.
   */
  subscriptionPlan: text("subscription_plan").default("free").notNull(),
  /** Stripe subscription `status` (e.g. `active`, `canceled`); null when no Stripe sub. */
  subscriptionStatus: text("subscription_status"),
  /** When false, this user bypasses monthly usage metering (operator override). */
  meteringEnabled: boolean("metering_enabled").default(true).notNull(),
  /** Operator override for free-tier Webflow Data API proxy cap; null uses tier default. */
  webflowProxyLimitOverride: integer("webflow_proxy_limit_override"),
  /** Operator override for free-tier CMS layout write cap; null uses tier default. */
  cmsWriteLimitOverride: integer("cms_write_limit_override"),
  /** Operator override for free-tier image optimize cap; null uses tier default. */
  imageOptimizeLimitOverride: integer("image_optimize_limit_override"),
  /** Set when operator early-access invite, team invite signup, or org join grants Tower/Beacon sign-in during MVP. */
  earlyAccessGrantedAt: timestamp("early_access_granted_at"),
  /**
   * Default team workspace for Tower UI when the user belongs to several orgs.
   * Cleared server-side if the org is deleted (`ON DELETE SET NULL`).
   */
  preferredOrganizationId: text("preferred_organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    activeOrganizationId: text("active_organization_id"),
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

/** Beacon Designer extension preferences (theme, defaults, presets) per Tower user. */
export const beaconAppSettings = pgTable("beacon_app_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  payload: jsonb("payload").$type<BeaconAppSettings>().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

/** Team tenant (Better Auth organization plugin). */
export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Nullable cap on members; null means unpaid solo workspace (see `TEAM_UNPAID_SEAT_CAP`). Set from Stripe team billing. */
    seatLimit: integer("seat_limit"),
    /** Last known per-seat quantity on the Stripe subscription (paid seats); not raised by operator grants. */
    stripeSeatQuantity: integer("stripe_seat_quantity"),
    /** When true, seat cap is operator-granted and Stripe quantity sync must not change billing or seat_limit. */
    operatorSeatLimitOverride: boolean("operator_seat_limit_override").default(false).notNull(),
    /** When false, members bypass monthly usage metering while this workspace is active (operator override). */
    meteringEnabled: boolean("metering_enabled").default(true).notNull(),
    /** Operator override for member Webflow proxy cap when this workspace is active; null uses tier/user default. */
    webflowProxyLimitOverride: integer("webflow_proxy_limit_override"),
    /** Operator override for member CMS write cap when this workspace is active; null uses tier/user default. */
    cmsWriteLimitOverride: integer("cms_write_limit_override"),
    /** Operator override for member image optimize cap when this workspace is active; null uses tier/user default. */
    imageOptimizeLimitOverride: integer("image_optimize_limit_override"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    billingPlan: text("billing_plan"),
    /** Team-wide Beacon export presets (designers + product admins). Merged into members’ effective settings. */
    beaconTeamSettings: jsonb("beacon_team_settings").$type<BeaconOrgTeamSettings | null>(),
    /** Canonical workspace owner; must always reference an active member. */
    ownerUserId: text("owner_user_id")
      .notNull()
      .references((): AnyPgColumn => user.id, { onDelete: "restrict" }),
    /** User responsible for paid workspace billing; required when Team billing is active. */
    billingOwnerUserId: text("billing_owner_user_id").references((): AnyPgColumn => user.id, {
      onDelete: "restrict",
    }),
    /** When set, workspace is soft-deleted and hidden from members until purged or recovered. */
    deletedAt: timestamp("deleted_at"),
    /** Permanent purge time after soft delete (typically deletedAt + recovery window). */
    purgeScheduledAt: timestamp("purge_scheduled_at"),
  },
  (table) => [
    index("organization_slug_idx").on(table.slug),
    index("organization_owner_user_id_idx").on(table.ownerUserId),
    index("organization_billing_owner_user_id_idx").on(table.billingOwnerUserId),
    index("organization_deleted_at_idx").on(table.deletedAt),
  ]
);

export const WORKSPACE_OWNERSHIP_TRANSFER_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "canceled",
] as const;
export type WorkspaceOwnershipTransferStatus = (typeof WORKSPACE_OWNERSHIP_TRANSFER_STATUSES)[number];

/** Pending workspace ownership handoff; recipient must accept before owner changes. */
export const workspaceOwnershipTransfer = pgTable(
  "workspace_ownership_transfer",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").$type<WorkspaceOwnershipTransferStatus>().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    /** When true, recipient must complete Stripe billing setup before accept commits. */
    requiresBillingAcceptance: boolean("requires_billing_acceptance").default(false).notNull(),
    /** Set after recipient completes Stripe checkout/portal for billing handoff. */
    stripeBillingReady: boolean("stripe_billing_ready").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_ownership_transfer_organization_id_idx").on(table.organizationId),
    index("workspace_ownership_transfer_to_user_id_idx").on(table.toUserId),
    index("workspace_ownership_transfer_from_user_id_idx").on(table.fromUserId),
    index("workspace_ownership_transfer_status_idx").on(table.status),
  ]
);

/** Webflow OAuth access token for Data API (Bearer), one row per workspace (organization). Admins connect once; all members use this token. */
export const organizationWebflowOAuthToken = pgTable("organization_webflow_oauth_token", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

/**
 * Binds Webflow OAuth `state` to a Tower user + workspace when OAuth is started (POST from Beacon or admin dashboard),
 * so the callback persists tokens on the correct `organizationId`.
 */
export const webflowOauthAuthorizeState = pgTable("webflow_oauth_authorize_state", {
  state: text("state").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Team roles: `admin`, `designer`, `editor` (see `tower-organization-access.ts`). */
    role: text("role").notNull(),
    /**
     * Team admins only: when true, Beacon hides designer features (team presets, manual controls, and related options).
     * Default false: designer features on until explicitly restricted in Beacon settings.
     */
    beaconRestrictToEditorExperience: boolean("beacon_restrict_to_editor_experience").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
    uniqueIndex("member_organization_user_unique").on(table.organizationId, table.userId),
  ]
);

/** Voluntary member exit from a workspace; visible to workspace admins/owners only. */
export const workspaceMemberDeparture = pgTable(
  "workspace_member_departure",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    memberId: text("member_id"),
    userEmail: text("user_email").notNull(),
    userName: text("user_name"),
    role: text("role").notNull(),
    departedAt: timestamp("departed_at").defaultNow().notNull(),
  },
  (table) => [
    index("workspace_member_departure_organization_id_idx").on(table.organizationId),
    index("workspace_member_departure_departed_at_idx").on(table.departedAt),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ]
);

/** Inbound feedback and help requests from Tower support FAB. */
export const supportRequest = pgTable(
  "support_request",
  {
    id: text("id").primaryKey(),
    /** `feedback` · `help` */
    kind: text("kind").notNull(),
    topic: text("topic").notNull(),
    details: text("details").notNull(),
    email: text("email").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** `pending` · `resolved` · `dismissed` */
    status: text("status").notNull().default("pending"),
    operatorNote: text("operator_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    index("support_request_status_idx").on(table.status),
    index("support_request_kind_idx").on(table.kind),
    index("support_request_created_at_idx").on(table.createdAt),
  ]
);

/** Inbound early-access interest queue. Approval uses `inviteCustomerForEarlyAccess`; access truth stays on `user`. */
export const earlyAccessRequest = pgTable(
  "early_access_request",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    note: text("note"),
    teamMemberEmails: jsonb("team_member_emails").$type<string[] | null>(),
    /** `pending` · `approved` · `dismissed` */
    status: text("status").notNull().default("pending"),
    /** Operator-provided reason emailed to the requester when declined. */
    declineReason: text("decline_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [index("early_access_request_status_idx").on(table.status)]
);

/** Monthly Vercel-side usage for metering (Beacon API + proxy); resets by calendar month. */
export const towerUsageMonth = pgTable(
  "tower_usage_month",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** `YYYY-MM` (UTC) */
    yearMonth: text("year_month").notNull(),
    webflowProxyRequestCount: integer("webflow_proxy_request_count").notNull().default(0),
    webflowProxyCmsSlotsCount: integer("webflow_proxy_cms_slots_count").notNull().default(0),
    webflowProxyImageUploadCmsCount: integer("webflow_proxy_image_upload_cms_count").notNull().default(0),
    cmsWriteCount: integer("cms_write_count").notNull().default(0),
    imageOptimizeCount: integer("image_optimize_count").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("tower_usage_month_user_ym").on(table.userId, table.yearMonth)]
);

/**
 * Monthly pooled usage for a paid Team workspace; resets by calendar month. Team metering is enforced
 * against this shared pool (per-seat cap × paid seats), not each member's individual `tower_usage_month`.
 */
export const towerWorkspaceUsageMonth = pgTable(
  "tower_workspace_usage_month",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** `YYYY-MM` (UTC) */
    yearMonth: text("year_month").notNull(),
    webflowProxyRequestCount: integer("webflow_proxy_request_count").notNull().default(0),
    webflowProxyCmsSlotsCount: integer("webflow_proxy_cms_slots_count").notNull().default(0),
    webflowProxyImageUploadCmsCount: integer("webflow_proxy_image_upload_cms_count").notNull().default(0),
    cmsWriteCount: integer("cms_write_count").notNull().default(0),
    imageOptimizeCount: integer("image_optimize_count").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("tower_workspace_usage_month_org_ym").on(table.organizationId, table.yearMonth)]
);

/**
 * Per-member attribution of pooled Team usage, written alongside `tower_workspace_usage_month` on each
 * team consume so workspace admins can see who is contributing to the shared pool. NOT used for
 * enforcement — the pool in `tower_workspace_usage_month` remains the single source of truth for caps.
 */
export const towerWorkspaceMemberUsageMonth = pgTable(
  "tower_workspace_member_usage_month",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** `YYYY-MM` (UTC) */
    yearMonth: text("year_month").notNull(),
    webflowProxyRequestCount: integer("webflow_proxy_request_count").notNull().default(0),
    webflowProxyCmsSlotsCount: integer("webflow_proxy_cms_slots_count").notNull().default(0),
    webflowProxyImageUploadCmsCount: integer("webflow_proxy_image_upload_cms_count").notNull().default(0),
    cmsWriteCount: integer("cms_write_count").notNull().default(0),
    imageOptimizeCount: integer("image_optimize_count").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("tower_workspace_member_usage_month_org_user_ym").on(
      table.organizationId,
      table.userId,
      table.yearMonth
    ),
  ]
);

/** Singleton platform defaults for monthly usage metering (Operator-managed). */
export const towerPlatformMetering = pgTable("tower_platform_metering", {
  id: text("id").primaryKey(),
  globalMeteringEnabled: boolean("global_metering_enabled").default(true).notNull(),
  freeWebflowProxyRequestsPerMonth: integer("free_webflow_proxy_requests_per_month").notNull(),
  freeCmsWritesPerMonth: integer("free_cms_writes_per_month").notNull(),
  freeImageOptimizesPerMonth: integer("free_image_optimizes_per_month").notNull(),
  proWebflowProxyRequestsPerMonth: integer("pro_webflow_proxy_requests_per_month").notNull(),
  proCmsWritesPerMonth: integer("pro_cms_writes_per_month").notNull(),
  proImageOptimizesPerMonth: integer("pro_image_optimizes_per_month").notNull(),
  studioWebflowProxyRequestsPerMonth: integer("studio_webflow_proxy_requests_per_month").notNull().default(60_000),
  studioCmsWritesPerMonth: integer("studio_cms_writes_per_month").notNull().default(12_000),
  studioImageOptimizesPerMonth: integer("studio_image_optimizes_per_month").notNull().default(3_000),
  teamWebflowProxyRequestsPerMonth: integer("team_webflow_proxy_requests_per_month").notNull(),
  teamCmsWritesPerMonth: integer("team_cms_writes_per_month").notNull(),
  teamImageOptimizesPerMonth: integer("team_image_optimizes_per_month").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

/** Sliding-window counters for destructive API actions (workspace delete, etc.). */
export const towerDestructiveActionRateLimit = pgTable("tower_destructive_action_rate_limit", {
  key: text("key").primaryKey(),
  windowStartedAt: timestamp("window_started_at").notNull(),
  attemptCount: integer("attempt_count").notNull(),
});

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  webflowOauthAuthorizeStates: many(webflowOauthAuthorizeState),
  beaconAppSettings: one(beaconAppSettings),
  members: many(member),
  towerUsageMonths: many(towerUsageMonth),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationWebflowOAuthTokenRelations = relations(organizationWebflowOAuthToken, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationWebflowOAuthToken.organizationId],
    references: [organization.id],
  }),
}));

export const webflowOauthAuthorizeStateRelations = relations(webflowOauthAuthorizeState, ({ one }) => ({
  user: one(user, {
    fields: [webflowOauthAuthorizeState.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [webflowOauthAuthorizeState.organizationId],
    references: [organization.id],
  }),
}));

export const beaconAppSettingsRelations = relations(beaconAppSettings, ({ one }) => ({
  user: one(user, {
    fields: [beaconAppSettings.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many, one }) => ({
  members: many(member),
  invitations: many(invitation),
  memberDepartures: many(workspaceMemberDeparture),
  ownershipTransfers: many(workspaceOwnershipTransfer),
  owner: one(user, {
    fields: [organization.ownerUserId],
    references: [user.id],
    relationName: "organizationOwner",
  }),
  billingOwner: one(user, {
    fields: [organization.billingOwnerUserId],
    references: [user.id],
    relationName: "organizationBillingOwner",
  }),
  webflowOAuthToken: one(organizationWebflowOAuthToken, {
    fields: [organization.id],
    references: [organizationWebflowOAuthToken.organizationId],
  }),
}));

export const workspaceOwnershipTransferRelations = relations(workspaceOwnershipTransfer, ({ one }) => ({
  organization: one(organization, {
    fields: [workspaceOwnershipTransfer.organizationId],
    references: [organization.id],
  }),
  fromUser: one(user, {
    fields: [workspaceOwnershipTransfer.fromUserId],
    references: [user.id],
    relationName: "ownershipTransferFrom",
  }),
  toUser: one(user, {
    fields: [workspaceOwnershipTransfer.toUserId],
    references: [user.id],
    relationName: "ownershipTransferTo",
  }),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const workspaceMemberDepartureRelations = relations(workspaceMemberDeparture, ({ one }) => ({
  organization: one(organization, {
    fields: [workspaceMemberDeparture.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [workspaceMemberDeparture.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));
