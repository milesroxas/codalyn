# Stripe billing (Tower)

Individual **Pro** subscriptions via **Stripe Checkout** and **Customer Portal**, with webhooks persisting state on the `user` table. **Workspace (Team)** billing uses per-seat Stripe subscriptions on `organization`, with seat quantity synced from members and pending invitations.

## Feature flag

**Billing UI and all Stripe server routes are off by default.**

Set in the environment:

| Value | Effect |
| ----- | ------ |
| Unset, `0`, or anything other than below | Stripe disabled: no `/billing` link, checkout/portal return 404, webhook returns 200 and ignores events, per-user Stripe Pro is not applied in entitlements. |
| `1`, `true`, or `yes` (case-insensitive) | Full Stripe flow enabled. |

```bash
TOWER_BILLING_ENABLED=1
```

## Database

Migration **`0004_tower_billing_usage`** adds to `user`: `stripe_customer_id`, `stripe_subscription_id`, `subscription_plan` (default `free`), `subscription_status`, and table **`tower_usage_month`** (monthly usage for free-tier caps).

Organization rows already include `stripe_customer_id`, `stripe_subscription_id`, `billing_plan`, `subscription_status`, and `seat_limit`.

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
| `TOWER_TEAM_MIN_SEATS` | No | Minimum seats on team checkout and Stripe sync (default `2`). |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Yes | Origins for Checkout success/cancel and Portal return URL. |
| `TOWER_METERING_DISABLED` | No | `1` disables free-tier **usage** caps only (emergency). |
| `TOWER_FREE_*` / `TOWER_PRO_*` | No | Optional overrides for monthly Webflow and image-optimize limits. |

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

1. **Pro product** with a **recurring** price — copy the **Price id** into `STRIPE_PRICE_PRO`.
2. **Team product** with a **per-seat recurring** price — copy the **Price id** into `STRIPE_PRICE_TEAM_SEAT`.
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
| `/billing` | GET | Server page: individual plan, usage, links to checkout/portal. |
| `/api/billing/checkout` | POST | Individual Pro Checkout (session required). |
| `/api/billing/portal` | GET | Individual Stripe Customer Portal. |
| `/team` | GET | Team page with workspace **Billing** tab (admins). |
| `/api/billing/workspace/checkout` | POST | Team per-seat Checkout for a workspace (`organizationId`). |
| `/api/billing/workspace/portal` | GET | Workspace Stripe Customer Portal (`organizationId` query). |
| `/api/stripe/webhook` | POST | Verifies signature, updates `user` or `organization` from events. |

## Code map

| Area | Path |
| ---- | ---- |
| Flag | `src/server/billing/billing-feature.ts` |
| Env vars + deploy guards | `src/server/billing/stripe-config.ts` |
| Stripe client | `src/server/billing/stripe-client.ts` |
| Team plan constants | `src/server/billing/team-billing-config.ts` |
| Org entitlement (single source) | `src/server/billing/organization-billing.ts` |
| Entitlements (user + org) | `src/server/billing/entitlements.ts` |
| Usage caps (Webflow + image) | `src/server/billing/usage-gate.ts`, `limits.ts` |
| Subscription status | `src/server/billing/stripe-subscription-status.ts` |
| Webhook application | `src/server/billing/stripe-webhook-apply.ts` |
| Checkout return sync (webhook fallback) | `src/server/billing/stripe-checkout-sync.ts` |
| User sync | `src/server/billing/stripe-app.ts` |
| Org sync + seat quantity | `src/server/billing/stripe-org-app.ts`, `stripe-org-seat-sync.ts` |
| Seat counting | `src/server/billing/organization-seat-count.ts`, `src/shared/lib/billing/organization-seat-cap.ts` |
| Workspace billing UI data | `src/server/billing/workspace-billing-view.ts` |

Individual checkout embeds `towerUserId` and `towerBillingScope: user`. Team checkout embeds `towerOrgId`, `towerUserId`, and `towerBillingScope: organization` so webhooks route to the correct table.

Checkout success URLs include `session_id={CHECKOUT_SESSION_ID}`. When the user lands on `/billing?checkout=success&session_id=…` or `/team?checkout=success&session_id=…`, Tower retrieves the session from Stripe and applies the same DB updates as `checkout.session.completed`. That covers webhook delay and local dev when webhooks are not forwarded to localhost.

## Local development

1. Set `TOWER_BILLING_ENABLED=1` and the Stripe keys / price ids in `.env` / `.env.local`.
2. Run the Tower app (`pnpm app tower dev`).
3. **Webhooks (recommended):** in another terminal, `stripe listen --forward-to localhost:3100/api/stripe/webhook` and copy the **signing secret** into `STRIPE_WEBHOOK_SECRET`. Restart Tower after updating the secret. The Stripe Dashboard “local listener active” state is the CLI on your machine — it is **not** the same as a Dashboard webhook pointing at preview/production.
4. Open `/billing` for individual Pro or `/team` → **Billing** for workspace Team checkout (test mode).

**Common local pitfall:** checkout runs on `localhost:3100`, but a Dashboard webhook may target `https://tower-preview.codalyn.app`. Payment succeeds in Stripe while the **local** database stays on the free plan. Use `stripe listen` for local Postgres, or rely on the checkout return sync in step 3 above.

## Switching Stripe accounts or test ↔ live

No code changes — update env vars and Dashboard setup per environment. Also:

- **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, **`STRIPE_PRICE_PRO`**, and **`STRIPE_PRICE_TEAM_SEAT`** must all belong to the same Stripe account **and** mode (`sk_test_…` + test price ids, or `sk_live_…` + live price ids).
- Configure a webhook endpoint (or `stripe listen`) for the Tower host that matches where you are testing.
- **Database:** `user` and `organization` rows store Stripe customer/subscription ids from the previous account. Reusing the same DB after switching accounts causes “subscribed” UI with broken portal/checkout until you clear those fields or use a fresh DB (`pnpm app tower db:reset:local -- --confirm` locally). Operator-set plans in the console are separate from Stripe.

## Usage metering (Vercel cost control)

Independent of **Stripe** but part of the same “billing” story: the **free** tier applies separate monthly caps (UTC) to Webflow Data API proxy traffic (`/api/v2/webflow/*`), CMS layout writes (`POST /api/v1/beacon/cms-layout/save`), and `POST /api/v1/images/optimize` for session-authenticated users on Vercel. **Pro** (via individual Stripe, **paid workspace**, or operator-set org plan) skips incrementing those counters. See `src/server/billing/limits.ts` and `.env.example` for override env names.

## Team seats

- Unpaid workspaces (`seat_limit` null) allow **1 member** (`TEAM_UNPAID_SEAT_CAP`) — solo only; invites require Team billing.
- Seat enforcement uses members **plus** pending invitations (shared helpers under `src/shared/lib/billing/organization-seat-cap.ts`).
- Better Auth hooks: `beforeCreateInvitation`, `beforeAcceptInvitation`, `beforeAddMember`, plus dynamic `invitationLimit`.
- `seat_limit` is not client-writable; Stripe webhooks and operator API (non-Stripe orgs only) update it.
- Over-cap workspaces (e.g. after subscription cancel) keep existing members but block new invites/accepts until resolved.
- Checkout quantity = `max(TOWER_TEAM_MIN_SEATS, members + pending invitations)`.
- Webhooks set `organization.seat_limit` from Stripe subscription quantity.
- Member/invitation hooks call `syncOrganizationSeatQuantityWithStripe` to keep Stripe and `seat_limit` aligned.
- Successful team checkout grants `canCreateOrganization` to the purchaser (for additional workspaces).
