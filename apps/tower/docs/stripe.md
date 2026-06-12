# Stripe billing (Tower) — operations

How Tower integrates with **Stripe**: products/prices, Checkout, Customer Portal, webhooks, env vars,
deploy guards, and local testing.

> For the **pricing model** — plans, tiers, entitlement resolution, accounts, roles, seats, and usage
> metering — see [docs/pricing-and-billing.md](pricing-and-billing.md). This file is scoped to the
> Stripe wiring only.

## Products & prices

Tower uses **three recurring Stripe prices** across **two billing scopes** (individual user vs
workspace). Tower only cares about the price ids and recurrence — names in the Stripe Dashboard are up
to you.

| Stripe price env | Plan | Recurrence | Billed entity (DB row) | Checkout entry |
| --- | --- | --- | --- | --- |
| `STRIPE_PRICE_PRO` | Pro | flat per user | `user` | `/billing` |
| `STRIPE_PRICE_STUDIO` | Studio | flat per user | `user` | `/billing` |
| `STRIPE_PRICE_TEAM_SEAT` | Team | **per seat** | `organization` | `/team` → **Billing** tab (admins) |

Pro and Studio are the **individual** (user-scoped) plans; Team is the **per-seat workspace** plan.
Checkout and Customer Portal are separate per scope. Webhooks persist subscription state and sync the
Team seat quantity.

## Feature flag

**Billing UI and all Stripe server routes are off by default.** The flag also gates individual
Pro/Studio detection in entitlements (operator-set org plans are independent of it).

| `TOWER_BILLING_ENABLED` | Effect |
| --- | --- |
| Unset, `0`, or anything other than below | Stripe disabled: no `/billing` link, checkout/portal return 404, webhook returns 200 and ignores events, per-user Stripe plans are not applied in entitlements. |
| `1`, `true`, or `yes` (case-insensitive) | Full Stripe flow enabled. |

```bash
TOWER_BILLING_ENABLED=1
```

Source: `src/server/billing/billing-feature.ts`.

## App routes (when `TOWER_BILLING_ENABLED=1`)

| Route | Method | Behavior |
| --- | --- | --- |
| `/billing` | GET | Individual plan, usage, Pro/Studio checkout + portal when eligible. |
| `/api/billing/checkout` | POST | Individual Checkout. Body `plan: "pro" \| "studio"` (defaults `pro`). 409 if already subscribed. |
| `/api/billing/portal` | GET | Individual Stripe Customer Portal. |
| `/api/billing/usage` | GET | Current usage snapshot for the signed-in user/active workspace. |
| `/team` | GET | Team page with workspace **Billing** tab (admins only). |
| `/api/billing/workspace/checkout` | POST | Team per-seat Checkout for a workspace (`organizationId`). |
| `/api/billing/workspace/portal` | GET | Workspace Stripe Customer Portal (`organizationId` query). |
| `/api/account/workspace-creation-eligibility` | GET | Authoritative gate for creating another owned workspace. |
| `/api/stripe/webhook` | POST | Verifies signature; updates `user` or `organization`. |

Shared route gate: `src/server/billing/stripe-billing-routes.ts` (requires billing enabled + Stripe
configured + signed-in session). Workspace checkout additionally requires the actor to be a team admin.

## Webhook routing and metadata

Checkout and subscription metadata distinguish scopes so events update the correct table:

| Scope | Metadata | Persisted on |
| --- | --- | --- |
| Individual (Pro/Studio) | `towerBillingScope: user`, `towerUserId` | `user` (`subscription_plan`, `subscription_status`, …) |
| Team | `towerBillingScope: organization`, `towerOrgId`, `towerUserId` (purchaser) | `organization` (`billing_plan: team`, `seat_limit`, …) |

Helpers: `src/server/billing/stripe-metadata.ts`. User-row updates are skipped when metadata indicates
organization billing or when the subscription id is tied to an org row
(`src/server/billing/stripe-individual-pro.ts`), so a Team subscription never grants individual Pro.

### Checkout return sync (webhook fallback)

Checkout success URLs include `session_id={CHECKOUT_SESSION_ID}`. When the user lands on
`/billing?checkout=success&session_id=…` or `/team?checkout=success&session_id=…`, Tower retrieves the
session from Stripe and applies the same DB updates as `checkout.session.completed`. This covers webhook
delay and local dev when webhooks are not forwarded to localhost
(`src/server/billing/stripe-checkout-sync.ts`).

## Team seat ↔ Stripe sync

Seat *policy* is documented in the pricing doc; the Stripe mechanics are:

- Checkout quantity = the admin-selected seat count, clamped up to a floor of
  `max(TOWER_TEAM_MIN_SEATS, members + pending invitations)` (so a workspace can buy spare seats to
  invite into; it can never buy below the minimum or below current usage). Defaults to the floor when
  no seat count is submitted (`team-seat-quantity.ts`).
- Webhooks set `organization.seat_limit` from the Stripe subscription quantity.
- Member/invitation Better Auth hooks (`beforeCreateInvitation`, `beforeAcceptInvitation`,
  `beforeAddMember`) call `syncOrganizationSeatQuantityWithStripe` to keep Stripe quantity and
  `seat_limit` aligned. Sync is **grow-only**: it raises quantity to fit new seats in use but never
  drops below the seats already purchased — reductions are made via the Customer Portal and applied
  through the webhook. `seat_limit` is **not** client-writable.
- `operator_seat_limit_override`: operator-granted seats — Stripe quantity sync must not change billing
  or `seat_limit` while set.

Source: `stripe-org-app.ts`, `stripe-org-seat-sync.ts`, `organization-seat-count.ts`,
`organization-seat-override.ts`.

## Usage metering (independent of Stripe)

Monthly usage caps are **not** part of Stripe — they are Vercel/infra cost control enforced at the API
boundary, with paid tiers (Pro/Studio/Team) getting higher caps. Stripe only determines *which tier* a
request resolves to. Full detail (meters, credits, pooled Team usage, operator overrides) is in
[docs/pricing-and-billing.md](pricing-and-billing.md). Defaults and env seed names live in
`src/server/billing/tower-limits-config.ts` and `../.env.example`.

## Environment variables

Documented in `../.env.example`. Summary:

| Variable | Required when billing is on | Purpose |
| --- | --- | --- |
| `TOWER_BILLING_ENABLED` | For prod behavior | Master switch; default off. |
| `STRIPE_SECRET_KEY` | Yes | API calls (Checkout, Portal, webhooks). Test: `sk_test_…`; live: `sk_live_…`. |
| `STRIPE_WEBHOOK_SECRET` | Yes (prod) / `stripe listen` (local) | Verifies `POST /api/stripe/webhook`. One secret per webhook endpoint. |
| `STRIPE_PRICE_PRO` | Yes (individual Pro) | **Recurring** Price id (Pro product). Test and live modes use different ids. |
| `STRIPE_PRICE_STUDIO` | Yes (individual Studio) | **Recurring** Price id (Studio product). |
| `STRIPE_PRICE_TEAM_SEAT` | Yes (team billing) | **Per-seat recurring** Price id for workspace Team plan. |
| `TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION` | No | Set to `1` on Vercel **Production** at go-live to reject `sk_test_` keys. Omit while prod still uses test mode. |
| `TOWER_TEAM_MIN_SEATS` | No | Minimum seats on team checkout and Stripe sync (default `6`). |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Yes | Origins for Checkout success/cancel and Portal return URL. |
| `TOWER_METERING_DISABLED` | No | `1` disables **usage** caps only (emergency); unrelated to Stripe. |
| `TOWER_{FREE,PRO,STUDIO,TEAM}_*` | No | Optional seed overrides for monthly limits (Operator Platform UI is runtime source of truth after migrate). |

## Multi-environment setup (local, preview, production)

Stripe mode is selected by the **secret key prefix** (`sk_test_` vs `sk_live_`). Tower does not hard-code
sandbox vs live — configure env vars per deployment. Guards: `src/server/billing/stripe-config.ts`.

| Environment | Vercel scope | Stripe mode | Database |
| --- | --- | --- | --- |
| Local | — | Test (`sk_test_…`) | Docker / Neon dev |
| Preview | Preview | Test (`sk_test_…`) | Neon `preview` branch |
| Production (pre-launch) | Production | Test (`sk_test_…`) | Neon prod |
| Production (go-live) | Production | Live (`sk_live_…`) | Neon prod |

**Vercel environment variables**

- **Preview + Development:** shared test keys, test price ids, preview webhook secret, `BETTER_AUTH_URL` /
  `NEXT_PUBLIC_APP_URL` pointing at preview (e.g. `https://tower-preview.codalyn.app`).
- **Production (while building):** same test keys and test price ids as preview; separate webhook
  endpoint on the production URL with its own `STRIPE_WEBHOOK_SECRET`.
- **Production (go-live):** replace Production-scoped vars with live keys, live price ids, and live
  webhook secret. Set `TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION=1` so a stray test key fails fast. Clear
  or migrate test-era `stripe_customer_id` / `stripe_subscription_id` rows in prod — test ids are invalid
  in live mode.

**Webhook endpoints (one signing secret each)**

| Environment | URL |
| --- | --- |
| Local | `stripe listen --forward-to localhost:3100/api/stripe/webhook` |
| Preview | `https://tower-preview.codalyn.app/api/stripe/webhook` |
| Production | `https://tower.codalyn.app/api/stripe/webhook` |

Preview deployments reject live keys automatically (`VERCEL_ENV=preview`). Production allows test keys
until `TOWER_STRIPE_REQUIRE_LIVE_IN_PRODUCTION=1`.

## Stripe Dashboard

Create the products (names are up to you; Tower only cares about price ids and recurrence):

1. **Pro** — one **recurring** price (flat per user) → `STRIPE_PRICE_PRO`.
2. **Studio** — one **recurring** price (flat per user) → `STRIPE_PRICE_STUDIO`.
3. **Team** — one **per-seat recurring** price → `STRIPE_PRICE_TEAM_SEAT`.

Also:

4. **Customer portal** — enable in [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal) so portal routes work.
   - Keep the **default** configuration with *switch plans* on and *change quantity* **off** (individual Pro/Studio are `quantity: 1` — customers must not edit quantity).
   - For self-serve **Team seat reductions**, create one extra portal **configuration** with *change quantity* **on** (eligible product = the Team seat price) and set its id as `STRIPE_PORTAL_CONFIG_WORKSPACE`. The workspace portal route (`/api/billing/workspace/portal`) passes it as `configuration`; unset falls back to the default portal. Seat *increases* still happen automatically as members are added (grow-only sync); the portal quantity control is the reduction lever.
5. **Webhooks** — endpoint: `https://<your-tower-host>/api/stripe/webhook` (same path in dev with `stripe listen` forwarding to localhost).

Subscribe to at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Database

Migration **`0004_tower_billing_usage`** adds to `user`: `stripe_customer_id`, `stripe_subscription_id`,
`subscription_plan` (default `free`), `subscription_status`, and table **`tower_usage_month`**.
Organization rows include `stripe_customer_id`, `stripe_subscription_id`, `billing_plan`,
`subscription_status`, `seat_limit`, `stripe_seat_quantity`, and related team fields. (Full schema:
`src/shared/lib/db/auth-schema.ts`.)

Apply with your usual process (see [README.md](../README.md#scripts)):

```bash
pnpm app tower db:migrate:local
pnpm app tower db:migrate:prod   # or dev / vercel variants
```

## Local development

1. Set `TOWER_BILLING_ENABLED=1` and the Stripe keys / price ids in `.env` / `.env.local`.
2. Run the Tower app (`pnpm app tower dev`).
3. **Webhooks (recommended):** in another terminal, `stripe listen --forward-to localhost:3100/api/stripe/webhook`
   and copy the **signing secret** into `STRIPE_WEBHOOK_SECRET`. Restart Tower after updating the secret.
   The Stripe Dashboard "local listener active" state is the CLI on your machine — it is **not** the same
   as a Dashboard webhook pointing at preview/production.
4. Open `/billing` for an individual plan or `/team` → **Billing** for workspace Team checkout (test mode).

**Common local pitfall:** checkout runs on `localhost:3100`, but a Dashboard webhook may target
`https://tower-preview.codalyn.app`. Payment succeeds in Stripe while the **local** database stays on the
free plan. Use `stripe listen` for local Postgres, or rely on the checkout return sync above.

## Switching Stripe accounts or test ↔ live

No code changes — update env vars and Dashboard setup per environment. Also:

- **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, and all **price ids** must belong to the same
  Stripe account **and** mode (`sk_test_…` + test price ids, or `sk_live_…` + live price ids).
- Configure a webhook endpoint (or `stripe listen`) for the Tower host that matches where you are testing.
- **Database:** `user` and `organization` rows store Stripe customer/subscription ids from the previous
  account. Reusing the same DB after switching accounts causes "subscribed" UI with broken portal/checkout
  until you clear those fields or use a fresh DB (`pnpm app tower db:reset:local -- --confirm` locally).
  Operator-set plans in the console are separate from Stripe.

## Code map

| Area | Path |
| --- | --- |
| Flag | `src/server/billing/billing-feature.ts` |
| Env vars + deploy guards | `src/server/billing/stripe-config.ts` |
| Stripe client | `src/server/billing/stripe-client.ts` |
| Route gate | `src/server/billing/stripe-billing-routes.ts` |
| Individual checkout (Pro/Studio) | `src/app/api/billing/checkout/route.ts`, `stripe-individual-plan.ts` |
| Team plan constants | `src/server/billing/team-billing-config.ts` |
| Individual plan detection | `src/server/billing/stripe-individual-pro.ts`, `stripe-subscription-status.ts` |
| Org entitlement | `src/server/billing/organization-billing.ts` |
| Webhook application | `src/server/billing/stripe-webhook-apply.ts` |
| Checkout return sync | `src/server/billing/stripe-checkout-sync.ts` |
| User Stripe sync | `src/server/billing/stripe-app.ts` |
| Org Stripe sync + seats | `src/server/billing/stripe-org-app.ts`, `stripe-org-seat-sync.ts` |
| Seat counting | `src/server/billing/organization-seat-count.ts`, `src/shared/lib/billing/organization-seat-cap.ts` |
| Workspace billing UI | `src/server/billing/workspace-billing-view.ts` |
| Metadata helpers | `src/server/billing/stripe-metadata.ts` |
