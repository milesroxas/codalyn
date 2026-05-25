# Stripe billing (Tower)

Individual **Pro** subscriptions via **Stripe Checkout** and **Customer Portal**, with webhooks persisting state on the `user` table. **Workspace/operator** billing on `organization` (operator console) is separate and does not require Stripe in Tower.

## Feature flag

**Billing UI and all Stripe server routes are off by default.**

Set in the environment:

| Value | Effect |
| ----- | ------ |
| Unset, `0`, or anything other than below | Stripe disabled: no `/billing` link, `GET` checkout/portal return 404, webhook returns 200 and ignores events, per-user Stripe Pro is not applied in entitlements. |
| `1`, `true`, or `yes` (case-insensitive) | Full Stripe flow enabled. |

```bash
TOWER_BILLING_ENABLED=1
```

## Database

Migration **`0004_tower_billing_usage`** adds to `user`: `stripe_customer_id`, `stripe_subscription_id`, `subscription_plan` (default `free`), `subscription_status`, and table **`tower_usage_month`** (monthly usage for free-tier caps).

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
| `STRIPE_PRICE_PRO` | Yes | **Recurring** Price id (Pro product). |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Yes | Origins for Checkout success/cancel and Portal return URL. |
| `TOWER_METERING_DISABLED` | No | `1` disables free-tier **usage** caps only (emergency). |
| `TOWER_FREE_*` / `TOWER_PRO_*` | No | Optional overrides for monthly Webflow and image-optimize limits. |

## Stripe Dashboard

1. **Product** with a **recurring** price — copy the **Price id** into `STRIPE_PRICE_PRO`.
2. **Customer portal** — enable in [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal) so `GET /api/billing/portal` works.
3. **Webhooks** — endpoint: `https://<your-tower-host>/api/stripe/webhook` (same path in dev with `stripe listen` forwarding to localhost).

Subscribe to at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## App routes (when `TOWER_BILLING_ENABLED=1`)

| Route | Method | Behavior |
| ----- | ------ | -------- |
| `/billing` | GET | Server page: plan, usage, links to checkout/portal. |
| `/api/billing/checkout` | POST | Creates Stripe Customer if needed, redirects to Checkout (session required). |
| `/api/billing/portal` | GET | Redirects to Stripe Customer Portal (requires `stripe_customer_id` on user). |
| `/api/stripe/webhook` | POST | Verifies signature, updates `user` from events. |

## Code map

| Area | Path |
| ---- | ---- |
| Flag | `src/server/billing/billing-feature.ts` |
| Entitlements (incl. org Pro) | `src/server/billing/entitlements.ts` |
| Usage caps (Webflow + image) | `src/server/billing/usage-gate.ts`, `limits.ts` |
| Subscription status (Pro entitled) | `src/server/billing/stripe-subscription-status.ts` |
| Webhook application | `src/server/billing/stripe-webhook-apply.ts` |
| API route | `src/app/api/stripe/webhook/route.ts` |
| User sync helpers | `src/server/billing/stripe-app.ts` |
| Checkout/portal route guards | `src/server/billing/stripe-billing-routes.ts` |

Checkout embeds `towerUserId` in `client_reference_id`, `metadata`, and `subscription_data.metadata` so webhooks can resolve the user.

## Local development

1. Set `TOWER_BILLING_ENABLED=1` and the Stripe keys / `STRIPE_PRICE_PRO` in `.env.local`.
2. Run the Tower app (`pnpm app tower dev`).
3. In another terminal, forward webhooks: `stripe listen --forward-to localhost:3100/api/stripe/webhook` and copy the **signing secret** into `STRIPE_WEBHOOK_SECRET`.
4. Open `/billing` while signed in and use **Upgrade to Pro** to test Checkout in test mode.

## Usage metering (Vercel cost control)

Independent of **Stripe** but part of the same “billing” story: the **free** tier applies monthly caps (UTC) to Webflow proxy/CMS writes and to `POST /api/v1/images/optimize` for session-authenticated users on Vercel. **Pro** (via Stripe when enabled, or **paid org** in operator) skips incrementing those counters. See `src/server/billing/limits.ts` and `.env.example` for override env names.
