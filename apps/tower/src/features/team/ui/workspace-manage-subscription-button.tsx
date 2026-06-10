import { IconExternalLink } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";

type WorkspaceManageSubscriptionButtonProps = {
  organizationId: string;
  variant?: "outline" | "link";
  showExternalIcon?: boolean;
};

/** Opens Stripe Customer Portal for the workspace subscription (server route). */
export function WorkspaceManageSubscriptionButton(props: WorkspaceManageSubscriptionButtonProps) {
  const { organizationId, variant = "outline", showExternalIcon = variant === "outline" } = props;
  const href = `/api/billing/workspace/portal?organizationId=${encodeURIComponent(organizationId)}`;

  if (variant === "link") {
    return (
      <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
        <a href={href}>Billing portal</a>
      </Button>
    );
  }

  return (
    <Button asChild variant="outline">
      <a href={href}>
        Manage subscription
        {showExternalIcon ? <IconExternalLink aria-hidden data-icon="inline-end" stroke={1.75} /> : null}
      </a>
    </Button>
  );
}
