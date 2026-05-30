# Stripe billing (Tower)

Tower uses **two Stripe products** that map to different database tables and customer stories. Runtime usage follows three tiers: **`free`**, **`pro`** (individual subscription), and **`team`** (paid workspace while active).

| Stripe product | Env price id | Billed entity | What it unlocks |
| -------------- | ------------ | ------------- | ---------------- |
| **Pro** (flat recurring) | `STRIPE_PRICE_PRO` | `user` | Individual Pro: **Pro usage limits** on unpaid workspaces; create **additional owned workspaces** (beyond one free). |
| **Team** (per-seat recurring) | `STRIPE_PRICE_TEAM_SEAT` | `organization` | Paid workspace: **seats** (invites), **Team usage limits** while that workspace is active; does **not** replace individual Pro for multi-workspace creation. |

Checkout and Customer Portal are separate per scope (`/billing` for Pro, `/team` → **Billing** for Team). Webhooks persist subscription state and sync seat quantity.

## Pro vs Team (product model)

### Usage limits (`free`, `pro`, `team`)

Limits apply to the **active workspace** (UTC month). See [Usage metering](#usage-metering-vercel-cost-control).

| Active context | Usage tier |
| -------------- | ---------- |
| Unpaid workspace (or no workspace) and no individual Pro | **Free** |
| Unpaid workspace (or no workspace) with individual Pro | **Pro** |
| Paid workspace (Stripe Team or operator-set plan) | **Team** |

Resolution: `src/server/billing/entitlements.ts` (`resolveTowerEntitlement`). Only the **active** organization is considered — membership in other paid workspaces does not change limits until you switch.

Individual Pro is detected with `userHasIndividualStripePro` — it ignores subscriptions whose id is also stored on an `organization` row (team subs must not grant individual Pro on `user`).

### Workspace creation (separate from Team membership)

| Rule | Detail |
| ---- | ------ |
| First owned workspace | Everyone (free tier). “Owned” = `admin` or `owner` on the workspace. |
| Additional owned workspaces | **Individual Pro** on the signed-in user (`STRIPE_PRICE_PRO`), or operator `user.canCreateOrganization`, or product admin. |
| Invited to a paid Team workspace | Members get **Pro usage** in that context; they do **not** gain extra workspace creation. |
| Team checkout purchaser | Does **not** receive `canCreateOrganization`; team billing does not substitute for individual Pro here. |

Server gate: `src/server/membership/user-workspace-creation-eligibility.ts`, enforced in Better Auth `allowUserToCreateOrganization` and `beforeCreateOrganization` (`src/server/membership/tower-organization.ts`). Client re-check: `GET /api/account/workspace-creation-eligibility`.

### Team seats (collaboration only)

- Unpaid workspace (`seat_limit` null): **1 member** (`TEAM_UNPAID_SEAT_CAP`) — solo; real invites need Team billing.
- Paid Team: `organization.billing_plan = "team"`, `seat_limit` from Stripe quantity (min `TOWER_TEAM_MIN_SEATS`, default 6).
- Seats count **members + pending invitations**; hooks sync quantity back to Stripe when membership changes.

## Feature flag

**Billing UI and all Stripe server routes are off by default.**

| Value | Effect |
| ----- | ------ |
| Unset, `0`, or anything other than below | Stripe disabled: no `/billing` link, checkout/portal return 404, webhook returns 200 and ignores events, per-user Stripe Pro is not applied in entitlements. |
| `1`, `true`, or `yes` (case-insensitive) | Full Stripe flow enabled. |

```bash
TOWER_BILLING_ENABLED=1
```

## Database

Migration **`0004_tower_billing_usage`** adds to `user`: `stripe_customer_id`, `stripe_subscription_id`, `subscription_plan` (default `free`), `subscription_status`, and table **`tower_usage_month`** (monthly usage for free-tier caps).

Organization rows include `stripe_customer_id`, `stripe_subscription_id`, `billing_plan`, `subscription_status`, `seat_limit`, and related team fields.

Apply with your usual process (see [README.md](../README.md#scripts)):

```bash
pnpm app tower db:migrate:local
pnpm app tower db:migrate:prod   # or dev / vercel variants
```

## Environment variables

Documented in `../.env.example`. Summary:

| Variable | Required when billing is on | Purpose |
| -------- | --------------------------- | -------- |
| `TOWER_BILLING_ENABLED` | For prod behavior | Master switch; default off. |
| `STRIPE_SECRET_KEY` | Yes | API calls (Checkout, Portal, webhooks). Test: `sk_test_…`; live: `sk_live_…`. |
| `STRIPE_WEBHOOK_SECRET` | Yes (prod) / `stripe listen` (local) | Verifies `POST /api/stripe/webhook`. One secret per webhook endpoint. |
| `STRIPE_PRICE_PRO` | Yes (individual Pro) | **Recurring** Price id (Pro product). Test and live modes use different ids. |
| `STRIPE_PRICE_TEAM_SEAT` | Yes (team billing) | **Per-seat recurring** Price id for workspace Team plan. |
| `TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION` | No | Set to `1` on Vercel **Production** at go-live to reject `sk_test_` keys. Omit while prod still uses test mode. |
| `TOWER_TEAM_MIN_SEATS` | No | Minimum seats on team checkout and Stripe sync (default `6`). |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Yes | Origins for Checkout success/cancel and Portal return URL. |
| `TOWER_METERING_DISABLED` | No | `1` disables free-tier **usage** caps only (emergency). |
| `TOWER_FREE_*` / `TOWER_PRO_*` | No | Optional seed overrides for monthly limits (Operator Platform UI is runtime source of truth after migrate). |

## Multi-environment setup (local, preview, production)

Stripe mode is selected by the **secret key prefix** (`sk_test_` vs `sk_live_`). Tower does not hard-code sandbox vs live — configure env vars per deployment.

| Environment | Vercel scope | Stripe mode | Database |
| ------------- | ------------ | ----------- | -------- |
| Local | — | Test (`sk_test_…`) | Docker / Neon dev |
| Preview | Preview | Test (`sk_test_…`) | Neon `preview` branch |
| Production (pre-launch) | Production | Test (`sk_test_…`) | Neon prod |
| Production (go-live) | Production | Live (`sk_live_…`) | Neon prod |

**Vercel environment variables**

- **Preview + Development:** shared test keys, test price ids, preview webhook secret, `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` pointing at preview (e.g. `https://tower-preview.codalyn.app`).
- **Production (while building):** same test keys and test price ids as preview; separate webhook endpoint on the production URL with its own `STRIPE_WEBHOOK_SECRET`.
- **Production (go-live):** replace Production-scoped vars with live keys, live price ids, and live webhook secret. Set `TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION=1` so a stray test key fails fast. Clear or migrate test-era `stripe_customer_id` / `stripe_subscription_id` rows in prod — test ids are invalid in live mode.

**Webhook endpoints (one signing secret each)**

| Environment | URL |
| ------------- | --- |
| Local | `stripe listen --forward-to localhost:3100/api/stripe/webhook` |
| Preview | `https://tower-preview.codalyn.app/api/stripe/webhook` |
| Production | `https://tower.codalyn.app/api/stripe/webhook` |

Preview deployments reject live keys automatically (`VERCEL_ENV=preview`). Production allows test keys until `TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION=1`.

## Stripe Dashboard

Create **two products** (names are up to you; Tower only cares about price ids and recurrence):

1. **Pro** — one **recurring** price (flat per user) → `STRIPE_PRICE_PRO`.
2. **Team** — one **per-seat recurring** price → `STRIPE_PRICE_TEAM_SEAT`.

Also:

3. **Customer portal** — enable in [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal) so portal routes work.
4. **Webhooks** — endpoint: `https://<your-tower-host>/api/stripe/webhook` (same path in dev with `stripe listen` forwarding to localhost).

Subscribe to at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## App routes (when `TOWER_BILLING_ENABLED=1`)

| Route | Method | Behavior |
| ----- | ------ | -------- |
| `/billing` | GET | Individual plan, usage, Pro checkout/portal when eligible. |
| `/api/billing/checkout` | POST | Individual Pro Checkout (session required). |
| `/api/billing/portal` | GET | Individual Stripe Customer Portal. |
| `/team` | GET | Team page with workspace **Billing** tab (admins). |
| `/api/billing/workspace/checkout` | POST | Team per-seat Checkout for a workspace (`organizationId`). |
| `/api/billing/workspace/portal` | GET | Workspace Stripe Customer Portal (`organizationId` query). |
| `/api/account/workspace-creation-eligibility` | GET | Authoritative gate for creating another owned workspace. |
| `/api/stripe/webhook` | POST | Verifies signature; updates `user` or `organization`. |

## Webhook routing and metadata

Checkout and subscription metadata distinguish scopes so events update the correct table:

| Scope | Metadata | Persisted on |
| ----- | -------- | -------------- |
| Individual Pro | `towerBillingScope: user`, `towerUserId` | `user` (`subscription_plan`, `subscription_status`, …) |
| Team | `towerBillingScope: organization`, `towerOrgId`, `towerUserId` (purchaser) | `organization` (`billing_plan: team`, `seat_limit`, …) |

Helpers: `src/server/billing/stripe-metadata.ts`. User-row updates are skipped when metadata indicates organization billing or when the subscription id is tied to an org row (`stripe-individual-pro.ts`).

## Code map

| Area | Path |
| ---- | ---- |
| Flag | `src/server/billing/billing-feature.ts` |
| Env vars + deploy guards | `src/server/billing/stripe-config.ts` |
| Stripe client | `src/server/billing/stripe-client.ts` |
| Team plan constants | `src/server/billing/team-billing-config.ts` |
| Individual Pro detection | `src/server/billing/stripe-individual-pro.ts` |
| Org entitlement | `src/server/billing/organization-billing.ts` |
| Entitlements (user + org) | `src/server/billing/entitlements.ts` |
| Workspace creation eligibility | `src/server/membership/user-workspace-creation-eligibility.ts` |
| Usage caps | `src/server/billing/usage-gate.ts`, `metering-policy.ts`, `tower-limits-config.ts` |
| Subscription status | `src/server/billing/stripe-subscription-status.ts` |
| Webhook application | `src/server/billing/stripe-webhook-apply.ts` |
| Checkout return sync (webhook fallback) | `src/server/billing/stripe-checkout-sync.ts` |
| User Stripe sync | `src/server/billing/stripe-app.ts` |
| Org Stripe sync + seats | `src/server/billing/stripe-org-app.ts`, `stripe-org-seat-sync.ts` |
| Seat counting | `src/server/billing/organization-seat-count.ts`, `src/shared/lib/billing/organization-seat-cap.ts` |
| Workspace billing UI | `src/server/billing/workspace-billing-view.ts` |

Checkout success URLs include `session_id={CHECKOUT_SESSION_ID}`. When the user lands on `/billing?checkout=success&session_id=…` or `/team?checkout=success&session_id=…`, Tower retrieves the session from Stripe and applies the same DB updates as `checkout.session.completed`. That covers webhook delay and local dev when webhooks are not forwarded to localhost.

## Local development

1. Set `TOWER_BILLING_ENABLED=1` and the Stripe keys / price ids in `.env` / `.env.local`.
2. Run the Tower app (`pnpm app tower dev`).
3. **Webhooks (recommended):** in another terminal, `stripe listen --forward-to localhost:3100/api/stripe/webhook` and copy the **signing secret** into `STRIPE_WEBHOOK_SECRET`. Restart Tower after updating the secret. The Stripe Dashboard “local listener active” state is the CLI on your machine — it is **not** the same as a Dashboard webhook pointing at preview/production.
4. Open `/billing` for individual Pro or `/team` → **Billing** for workspace Team checkout (test mode).

**Common local pitfall:** checkout runs on `localhost:3100`, but a Dashboard webhook may target `https://tower-preview.codalyn.app`. Payment succeeds in Stripe while the **local** database stays on the free plan. Use `stripe listen` for local Postgres, or rely on the checkout return sync above.

## Switching Stripe accounts or test ↔ live

No code changes — update env vars and Dashboard setup per environment. Also:

- **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, **`STRIPE_PRICE_PRO`**, and **`STRIPE_PRICE_TEAM_SEAT`** must all belong to the same Stripe account **and** mode (`sk_test_…` + test price ids, or `sk_live_…` + live price ids).
- Configure a webhook endpoint (or `stripe listen`) for the Tower host that matches where you are testing.
- **Database:** `user` and `organization` rows store Stripe customer/subscription ids from the previous account. Reusing the same DB after switching accounts causes “subscribed” UI with broken portal/checkout until you clear those fields or use a fresh DB (`pnpm app tower db:reset:local -- --confirm` locally). Operator-set plans in the console are separate from Stripe.

## Usage metering (Vercel cost control)

Independent of **Stripe** but part of the same “billing” story: the **free** tier applies separate monthly caps (UTC) to Webflow Data API proxy traffic (`/api/v2/webflow/*`), CMS layout writes (`POST /api/v1/beacon/cms-layout/save`), and `POST /api/v1/images/optimize` for session-authenticated users on Vercel.

**Pro** tier (individual Stripe, paid workspace membership, or operator org plan) skips incrementing those counters. Operator per-user or per-org overrides can set custom caps or disable metering without Stripe.

Defaults and env seed names: `src/server/billing/tower-limits-config.ts`, `../.env.example`.

## Team seats (implementation checklist)

- Unpaid workspaces (`seat_limit` null): **1 member** — solo only; invites require Team billing.
- Seat enforcement: members **plus** pending invitations (`src/shared/lib/billing/organization-seat-cap.ts`).
- Better Auth hooks: `beforeCreateInvitation`, `beforeAcceptInvitation`, `beforeAddMember`, plus dynamic `invitationLimit`.
- `seat_limit` is not client-writable; Stripe webhooks and operator API (non-Stripe orgs) update it.
- Over-cap workspaces (e.g. after subscription cancel) keep existing members but block new invites/accepts until resolved.
- Checkout quantity = `max(TOWER_TEAM_MIN_SEATS, members + pending invitations)`.
- Webhooks set `organization.seat_limit` from Stripe subscription quantity.
- Member/invitation hooks call `syncOrganizationSeatQuantityWithStripe` to keep Stripe and `seat_limit` aligned.

## Customer-facing positioning (suggested copy)

- **Pro** — freelancers: higher limits and multiple workspaces you own; work solo in each until that workspace subscribes to Team for collaborators.
- **Team** — studios: pay per seat on a workspace; every member gets Pro limits **in paid workspaces**; buying Team does not add personal multi-workspace creation (that stays on individual Pro).

Avoid positioning Team as “includes Pro on your account” for workspace creation — it shares **usage tier** only.
