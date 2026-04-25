import type { BeaconAppSettings, BeaconOrgTeamSettings } from "@codalyn/webflow-kit";
import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
   * Eligible to create organizations (team workspaces). Set by signup intent, billing/upgrade webhooks, or ops.
   * Server-enforced via `allowUserToCreateOrganization`; not set by public client input.
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

/**
 * Binds Webflow OAuth `state` to a Tower user when the Designer extension starts OAuth via POST (Bearer session),
 * so the browser callback does not rely on a first-party session cookie.
 */
export const webflowOauthAuthorizeState = pgTable("webflow_oauth_authorize_state", {
  state: text("state").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Webflow OAuth access token for Data API (Bearer), one row per Tower user. */
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

export const webflowOAuthToken = pgTable("webflow_oauth_token", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
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
    /** Nullable cap on members; null means use a high default (free tier). Wired to Stripe seat count later. */
    seatLimit: integer("seat_limit"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status"),
    billingPlan: text("billing_plan"),
    /** Team-wide Beacon export presets (designers + product admins). Merged into members’ effective settings. */
    beaconTeamSettings: jsonb("beacon_team_settings").$type<BeaconOrgTeamSettings | null>(),
  },
  (table) => [index("organization_slug_idx").on(table.slug)]
);

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
     * Default true: designer features off until explicitly enabled in Team settings.
     */
    beaconRestrictToEditorExperience: boolean("beacon_restrict_to_editor_experience").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
    uniqueIndex("member_organization_user_unique").on(table.organizationId, table.userId),
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

/** Monthly Vercel-side usage for metering (Beacon API + proxy); resets by calendar month. */
export const towerUsageMonth = pgTable(
  "tower_usage_month",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** `YYYY-MM` (UTC) */
    yearMonth: text("year_month").notNull(),
    webflowRequestCount: integer("webflow_request_count").notNull().default(0),
    imageOptimizeCount: integer("image_optimize_count").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("tower_usage_month_user_ym").on(table.userId, table.yearMonth)]
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  webflowOAuth: one(webflowOAuthToken),
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

export const webflowOAuthTokenRelations = relations(webflowOAuthToken, ({ one }) => ({
  user: one(user, {
    fields: [webflowOAuthToken.userId],
    references: [user.id],
  }),
}));

export const webflowOauthAuthorizeStateRelations = relations(webflowOauthAuthorizeState, ({ one }) => ({
  user: one(user, {
    fields: [webflowOauthAuthorizeState.userId],
    references: [user.id],
  }),
}));

export const beaconAppSettingsRelations = relations(beaconAppSettings, ({ one }) => ({
  user: one(user, {
    fields: [beaconAppSettings.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
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
