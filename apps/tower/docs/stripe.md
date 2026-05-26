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
| `STRIPE_SECRET_KEY` | Yes | API calls (Checkout, Portal, webhooks). |
| `STRIPE_WEBHOOK_SECRET` | Yes (prod) / `stripe listen` (local) | Verifies `POST /api/stripe/webhook`. |
| `STRIPE_PRICE_PRO` | Yes (individual Pro) | **Recurring** Price id (Pro product). |
| `STRIPE_PRICE_TEAM_SEAT` | Yes (team billing) | **Per-seat recurring** Price id for workspace Team plan. |
| `TOWER_TEAM_MIN_SEATS` | No | Minimum seats on team checkout and Stripe sync (default `2`). |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Yes | Origins for Checkout success/cancel and Portal return URL. |
| `TOWER_METERING_DISABLED` | No | `1` disables free-tier **usage** caps only (emergency). |
| `TOWER_FREE_*` / `TOWER_PRO_*` | No | Optional overrides for monthly Webflow and image-optimize limits. |

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
| Team plan constants | `src/server/billing/team-billing-config.ts` |
| Org entitlement (single source) | `src/server/billing/organization-billing.ts` |
| Entitlements (user + org) | `src/server/billing/entitlements.ts` |
| Usage caps (Webflow + image) | `src/server/billing/usage-gate.ts`, `limits.ts` |
| Subscription status | `src/server/billing/stripe-subscription-status.ts` |
| Webhook application | `src/server/billing/stripe-webhook-apply.ts` |
| User sync | `src/server/billing/stripe-app.ts` |
| Org sync + seat quantity | `src/server/billing/stripe-org-app.ts`, `stripe-org-seat-sync.ts` |
| Seat counting | `src/server/billing/organization-seat-count.ts` |
| Workspace billing UI data | `src/server/billing/workspace-billing-view.ts` |

Individual checkout embeds `towerUserId` and `towerBillingScope: user`. Team checkout embeds `towerOrgId`, `towerUserId`, and `towerBillingScope: organization` so webhooks route to the correct table.

## Local development

1. Set `TOWER_BILLING_ENABLED=1` and the Stripe keys / price ids in `.env.local`.
2. Run the Tower app (`pnpm app tower dev`).
3. In another terminal, forward webhooks: `stripe listen --forward-to localhost:3100/api/stripe/webhook` and copy the **signing secret** into `STRIPE_WEBHOOK_SECRET`.
4. Open `/billing` for individual Pro or `/team` → **Billing** for workspace Team checkout (test mode).

## Usage metering (Vercel cost control)

Independent of **Stripe** but part of the same “billing” story: the **free** tier applies separate monthly caps (UTC) to Webflow Data API proxy traffic (`/api/v2/webflow/*`), CMS layout writes (`POST /api/v1/beacon/cms-layout/save`), and `POST /api/v1/images/optimize` for session-authenticated users on Vercel. **Pro** (via individual Stripe, **paid workspace**, or operator-set org plan) skips incrementing those counters. See `src/server/billing/limits.ts` and `.env.example` for override env names.

## Team seats

- Unpaid workspaces (`seat_limit` null) allow **1 member** (`TEAM_UNPAID_SEAT_CAP`) — solo only; invites require Team billing.
- Checkout quantity = `max(TOWER_TEAM_MIN_SEATS, members + pending invitations)`.
- Webhooks set `organization.seat_limit` from Stripe subscription quantity.
- Member/invitation hooks call `syncOrganizationSeatQuantityWithStripe` to keep Stripe and `seat_limit` aligned.
- Successful team checkout grants `canCreateOrganization` to the purchaser (for additional workspaces).
