# Pricing, billing, accounts & metering

Single source of truth for how Codalyn's pricing model is currently implemented: plans, who pays for
what, accounts and roles, seats, and usage metering. This is the conceptual + current-config
reference; for Stripe operations (env vars, webhooks, dashboard, local testing) see
[docs/stripe.md](stripe.md).

> Accuracy note: every number and rule below is sourced from code. The **plan catalog** lives in
> `packages/webflow-kit/src/tower/tower-plan-catalog.ts`; **usage caps** live in an operator-managed
> database snapshot (`tower_platform_metering`) seeded from `src/server/billing/tower-limits-config.ts`.
> Caps are runtime-overridable, so treat the numbers here as the **code defaults**, not contractual limits.

---

## 1. The four plans

Plan keys are the canonical contract and are **1:1 with usage cap tiers**. Source:
`tower-plan-catalog.ts`.

| Plan | Key | Billed to | Seat model | Paid? | Owned-workspace allowance | Usage scope |
| --- | --- | --- | --- | --- | --- | --- |
| **Free** | `free` | individual user | single (1 seat) | No | 1 | per-user |
| **Pro** | `pro` | individual user | single (1 seat) | Yes | 3 | per-user |
| **Studio** | `studio` | individual user | single (1 seat) | Yes | 10 | per-user |
| **Team** | `team` | workspace (per seat) | per-seat (min 6) | Yes | 1 | **pooled across workspace** |

Two **billing scopes** drive everything:

- **`user` scope** (Free / Pro / Studio) — the plan follows the **person** across all their solo and
  unpaid workspaces. Usage is metered per user.
- **`workspace` scope** (Team) — the plan is attached to **one workspace**, billed per seat. Usage is a
  **shared monthly pool** for everyone in that workspace.

Critical nuance: **Team is not "Pro for the whole team."** It grants a higher *pooled* usage tier and
paid seats for collaboration. It does **not** raise an individual's owned-workspace allowance (that
stays on the user's personal Pro/Studio plan). UI copy must never imply Team includes personal Pro for
workspace creation (`tower-usage-metering-copy.ts` enforces scope-aware language).

---

## 2. Accounts model

There are two account-level entities, both backed by Better Auth (Drizzle + Neon). Schema:
`src/shared/lib/db/auth-schema.ts`.

### Users (`user`)

- App-wide role (`user.role`): `user` or **`product_admin`** (operator), from the Better Auth admin
  plugin. Product admins are seeded from `TOWER_PRODUCT_ADMIN_EMAILS`.
- Individual billing fields: `stripe_customer_id`, `stripe_subscription_id`,
  `subscription_plan` (`free` default, or `pro` / `studio`), `subscription_status`. **Webhook-synced —
  never set from the client.**
- Operator overrides on the user row: `metering_enabled`, `can_create_organization`, and per-meter
  limit overrides (`webflow_proxy_limit_override`, `cms_write_limit_override`,
  `image_optimize_limit_override`).
- `early_access_granted_at` gates MVP sign-in.

### Workspaces (`organization`)

A "workspace" is a Better Auth **organization** (team tenant). Billing fields: `billing_plan`
(`team` when self-serve), `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`,
`seat_limit`, `stripe_seat_quantity`, `operator_seat_limit_override`, plus the same operator metering
overrides as the user row.

- `owner_user_id` — canonical owner (must reference an active member).
- `billing_owner_user_id` — who is responsible for paid Team billing.
- Soft delete via `deleted_at` / `purge_scheduled_at`; ownership can be handed off via
  `workspace_ownership_transfer` (with optional Stripe billing-handoff gating).
- One Webflow OAuth token per workspace (`organization_webflow_oauth_token`): an admin connects once,
  all members use it.

---

## 3. Roles & permissions

### Team roles (`member.role`)

Source of truth: `src/shared/lib/membership/tower-organization-access.ts` (Better Auth access control,
shared by server and browser client).

| Role | Manage org/members/invites/seats/billing | Design workspace | Read |
| --- | --- | --- | --- |
| `admin` (and `owner`) | Yes | Yes | Yes |
| `designer` | No | Yes | Yes |
| `editor` | No | No | Yes |

- Only `admin` / `owner` may manage members, invitations, role assignments, seats, and Team billing
  (`isTowerTeamAdminRole`). This is enforced in access control **and** UI — e.g. Stripe checkout for a
  workspace requires the actor to be a team admin (`stripe-checkout-sync.ts`).
- Team admins can flip `beacon_restrict_to_editor_experience` per member to hide designer-only Beacon
  features.

### App-wide role

`product_admin` is the operator/staff role. Product admins bypass workspace-creation limits and access
the operator console (`/console`).

---

## 4. Entitlement resolution (which tier am I?)

The active usage tier is resolved **per request**, memoized per `(user, active workspace)`. Source:
`src/server/billing/entitlements.ts` (`resolveTowerEntitlement`).

Resolution order:

1. **Active workspace first** — if the currently active workspace is Team-entitled, tier = `team`
   (`source: workspace_team`).
2. **Else the user's individual plan** — `studio` or `pro` from their own Stripe subscription
   (`source: user_stripe`).
3. **Else `free`** (`source: none`).

| Active context | Resolved tier |
| --- | --- |
| Active workspace is paid Team | **Team** |
| No paid workspace active, user has Studio sub | **Studio** |
| No paid workspace active, user has Pro sub | **Pro** |
| Otherwise | **Free** |

Only the **active** organization counts. Belonging to other paid workspaces does **not** change your
tier until you switch to one of them.

### What counts as "entitled"

- **Individual (Pro/Studio):** `subscription_plan` is `pro`/`studio`, a `stripe_subscription_id` exists,
  and `subscription_status` ∈ {`active`, `trialing`, `past_due`} (past_due is a grace state). Studio is
  detected when the Studio price id is on the subscription, otherwise it resolves to Pro. A subscription
  whose id also appears on an `organization` row is ignored for individual entitlement (a Team sub must
  not grant personal Pro). Source: `stripe-subscription-status.ts`, `stripe-individual-plan.ts`,
  `stripe-individual-pro.ts`.
- **Workspace (Team):** same entitled statuses, plus `billing_plan = "team"` with a Stripe subscription,
  **or** a legacy operator-set plan string (`"team"`, `"pro team"`, `"team pro"`, `"pro+"`, `"pro"`).
  Source: `organization-billing.ts`.

### Billing feature flag

`TOWER_BILLING_ENABLED` (default **off**) gates Stripe Checkout, webhooks, the Customer Portal, the
`/billing` UI, **and** individual Pro/Studio detection in entitlements. When off,
`resolveUserIndividualPlan` returns null, so no user-scoped paid plan applies. Operator-set org plans
are independent of this flag. Source: `billing-feature.ts`.

---

## 5. Stripe products & checkout

Three recurring prices map to the plans (full ops detail in [docs/stripe.md](stripe.md)):

| Stripe price env | Plan | Billed entity | Checkout entry |
| --- | --- | --- | --- |
| `STRIPE_PRICE_PRO` | Pro | `user` | `/billing` |
| `STRIPE_PRICE_STUDIO` | Studio | `user` | `/billing` |
| `STRIPE_PRICE_TEAM_SEAT` | Team (per seat) | `organization` | `/team` → Billing tab (admins) |

- Individual checkout persists to the **`user`** row; Team checkout persists to the **`organization`**
  row. Webhook metadata (`towerBillingScope`, `towerUserId`, `towerOrgId`) routes events to the right
  table.
- A **checkout-return sync** applies the same DB updates as the webhook when the user returns from
  Checkout, covering webhook delay / local dev (`stripe-checkout-sync.ts`).
- Entitled statuses include `past_due` (grace) so a temporary payment failure doesn't immediately
  revoke access.

---

## 6. Workspace creation allowance

Separate from usage tier and from Team membership. Source:
`src/server/membership/user-workspace-creation-eligibility.ts`. "Owned" = the user is `admin` or
`owner` of the workspace (non-admin memberships don't count).

| Individual plan | Owned workspaces allowed |
| --- | --- |
| Free | 1 |
| Pro | 3 |
| Studio | 10 |

- **Team membership never raises this** — the allowance always comes from the user's *own* individual
  plan.
- **Bypasses:** `product_admin`, or the operator override `user.can_create_organization`.
- Enforced server-side in Better Auth (`allowUserToCreateOrganization` / `beforeCreateOrganization`,
  `tower-organization.ts`) and re-checked by the client via
  `GET /api/account/workspace-creation-eligibility`.

---

## 7. Seats (Team collaboration)

Source: `src/shared/lib/billing/organization-seat-cap.ts`, `workspace-seat-usage.ts`,
`workspace-billing-view.ts`.

- **Unpaid workspace** (`seat_limit` is null): cap = **1 seat** (`TEAM_UNPAID_SEAT_CAP`) — solo only.
  Real invites require Team billing.
- **Paid Team:** `seat_limit` is set from the Stripe subscription quantity, with a floor of
  `TOWER_TEAM_MIN_SEATS` (default **6**, `TOWER_TEAM_DEFAULT_SEAT_MINIMUM`).
- A "seat" is consumed by **members + pending invitations**. Invite creation is blocked at the cap
  (dynamic Better Auth `invitationLimit`).
- Checkout quantity = the admin-selected seat count, clamped up to a floor of
  `max(min seats, members + pending invitations)` — admins can buy spare seats to invite into, but
  never below the minimum or current usage (defaults to the floor when unspecified). Membership/invitation
  hooks then sync the quantity back to Stripe **grow-only** (member churn never reduces purchased seats;
  reductions go through the Customer Portal).
- **Over-cap** workspaces (e.g. after a cancel) keep existing members but block new invites/accepts
  until resolved.
- `operator_seat_limit_override`: operator-granted seats; Stripe quantity sync must not change billing
  or `seat_limit` while set. The billing UI shows "billed on subscription" vs "allowed" when they differ.

---

## 8. Usage metering

Independent of Stripe (it's Vercel/infra cost control) but part of the same pricing story. Metering is
enforced server-side at the API boundary; the **monthly window resets at the start of each UTC calendar
month**. Sources: `usage-gate.ts`, `metering-policy.ts`, `tower-limits-config.ts`, and
`packages/webflow-kit/src/tower/`.

### The three meters

| Meter (`kind`) | Customer label | What increments it | Enforced on |
| --- | --- | --- | --- |
| `webflowProxy` | "Webflow updates" | Every Webflow Data API proxy call (`/api/v2/webflow/*`) — CMS Slots setup/sync, slot targets, CMS field connects, Composer template saves, image publish to CMS | shared monthly cap |
| `cmsWrite` | "Layout saves" | Saving a block-based layout via `POST /api/v1/beacon/cms-layout/save` (1 per save) | shared monthly cap |
| `image` | "Image optimization credits" | Tower image optimization via `POST /api/v1/images/optimize` (AVIF path); previews of optimized size | **credits**, not count |

`webflowProxy` is further split for **display only** into `cmsSlots` vs `imageUploadCms` categories
(`webflow-proxy-usage-category.ts`); enforcement uses the single shared proxy cap.

### Image optimization credits

`image` is charged in **credits (1–10)**, not per export, because Tower AVIF optimization cost scales
with output size. Source: `packages/webflow-kit/src/image/image-optimization-credits.ts`.

- Cost scales by output megapixels (e.g. ~720p → 1 credit, 1080p → 3, 1440p → 5, large → up to 10), with
  a floor based on source byte size.
- **WebP costs ~half** of AVIF. **WebP exports done in the Designer (not through Tower) use no credits.**
- Invalid/unknown dimensions fail safe to the **max** (never undercharge).

### Cap defaults (code defaults — operator-overridable)

These are the early-access protective defaults seeded into `tower_platform_metering`. Per-meter values
are monthly. **Team values are per-seat and multiplied by paid seats** for the pooled cap.

| Tier | Webflow updates / mo | Layout saves / mo | Image credits / mo |
| --- | --- | --- | --- |
| Free | 2,500 | 500 | 25 |
| Pro | 25,000 | 5,000 | 500 |
| Studio | 60,000 | 12,000 | 1,500 |
| Team (per seat) | 120,000 | 25,000 | 3,000 |

Example: a Team workspace billed for 6 seats has a pooled cap of `6 × 120,000 = 720,000` Webflow
updates for the month, shared across all members.

### How caps are resolved

`resolveMeteringPolicy` (`metering-policy.ts`) computes the effective cap per meter:

- **User scope:** `user override → org override → tier default`.
- **Workspace (Team pooled) scope:** `org override (absolute pool cap) → per-seat tier default × paid seats`.
  Per-user overrides are **ignored** for a shared pool.
- **Paid seat count** for the pool prefers `stripe_seat_quantity`, then `seat_limit`, never below the
  team minimum (`resolvePooledSeatCount`).

### When metering is skipped (`skipMetering`)

- Global kill switch: `TOWER_METERING_DISABLED=1` (env emergency) **or** the operator
  `global_metering_enabled` toggle is off.
- Per-user scope: the user's `metering_enabled` is false, or the active org's `metering_enabled` is false.
- Per-workspace scope: the workspace's `metering_enabled` is false.

When skipped, requests are not counted and caps report as unmetered (∞).

### Reservation & enforcement

- Reservation is **all-or-nothing**: a single request whose cost (≥1 unit, or N image credits) would
  exceed the remaining allowance is **blocked**, never partially charged (`reserveUnits`).
- A blocked request returns **HTTP 402** with code `TOWER_USAGE_LIMIT` and `{kind, used, limit, usageScope}`.
  Beacon parses this to show the right "limit reached" dialog (and falls back AVIF→WebP for image limits).
- Concurrency-safe: reservations take a Postgres advisory lock per `(scope|id|month|meter)` inside a
  transaction.
- **"Approaching" warnings** trigger at **80%** of a cap (`TOWER_USAGE_APPROACHING_LIMIT_RATIO = 0.8`).

### Where usage is stored

| Table | Keyed by | Purpose |
| --- | --- | --- |
| `tower_usage_month` | user + `YYYY-MM` | Per-user (Free/Pro/Studio) enforcement counters |
| `tower_workspace_usage_month` | organization + `YYYY-MM` | **Team pooled** counters — the enforcement source of truth |
| `tower_workspace_member_usage_month` | org + user + `YYYY-MM` | Per-member attribution of pooled usage — **display only**, so admins can see contributors. Never used for enforcement |

---

## 9. Operator controls (no Stripe required)

Product admins can adjust billing/metering at runtime via the operator console
(`src/server/operator/usage-limits.ts`):

- Set **platform tier defaults** (`tower_platform_metering` snapshot) per tier and meter.
- Toggle **global metering** on/off.
- Per-user / per-workspace: enable/disable metering and set custom per-meter caps (overrides).
- Reset a user's or a workspace's monthly usage.
- Grant Team-equivalent limits to a workspace via a legacy plan string, and grant extra seats via
  `operator_seat_limit_override` without Stripe.
- Grant extra owned-workspace creation via `user.can_create_organization`.

End-user billing UI surfaces whether limits are `standard` (tier default), `custom` (operator override),
or `unmetered` (`resolveUsageLimitsKind`).

---

## 10. Quick code map

| Concern | Path |
| --- | --- |
| Plan catalog (contract) | `packages/webflow-kit/src/tower/tower-plan-catalog.ts` |
| Tier resolution | `apps/tower/src/server/billing/entitlements.ts` |
| Individual plan detection | `apps/tower/src/server/billing/stripe-individual-{plan,pro}.ts`, `stripe-subscription-status.ts` |
| Workspace (Team) entitlement | `apps/tower/src/server/billing/organization-billing.ts` |
| Cap defaults / operator snapshot | `apps/tower/src/server/billing/tower-limits-config.ts` |
| Metering policy (cap resolution) | `apps/tower/src/server/billing/metering-policy.ts` |
| Metering enforcement (reserve/402) | `apps/tower/src/server/billing/usage-gate.ts` |
| Image credits | `packages/webflow-kit/src/image/image-optimization-credits.ts` |
| Seats | `apps/tower/src/shared/lib/billing/organization-seat-cap.ts`, `workspace-seat-usage.ts` |
| Workspace creation eligibility | `apps/tower/src/server/membership/user-workspace-creation-eligibility.ts` |
| Roles / access control | `apps/tower/src/shared/lib/membership/tower-organization-access.ts` |
| Customer-facing copy | `packages/webflow-kit/src/tower/tower-usage-metering-copy.ts` |
| Operator usage controls | `apps/tower/src/server/operator/usage-limits.ts` |
| Stripe operations (env, webhooks, deploy) | [docs/stripe.md](stripe.md) |
