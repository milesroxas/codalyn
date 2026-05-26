import { Button } from "@/shared/ui/button";

const WORKSPACE_CHECKOUT_ACTION = "/api/billing/workspace/checkout";

export function WorkspaceTeamCheckoutForm(props: { organizationId: string }) {
  const { organizationId } = props;

  return (
    <form action={WORKSPACE_CHECKOUT_ACTION} method="post">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Button type="submit">Subscribe to Team</Button>
    </form>
  );
}
