import type { OperatorWorkspaceBillingMode } from "@/server/operator/types";

export function operatorWorkspaceBillingModeDescription(mode: OperatorWorkspaceBillingMode): string {
  switch (mode) {
    case "free":
      return "Solo workspace on the free tier. One seat for the owner; Team checkout unlocks invites and per-seat billing.";
    case "stripe_team":
      return "Team plan billed per seat through Stripe. Plan and subscription status sync from webhooks; operators can raise the effective seat cap without increasing Stripe billing.";
    case "legacy_paid":
      return "Pro entitlements from operator-set plan metadata. Use for comps, migrations, or accounts without Stripe.";
  }
}
