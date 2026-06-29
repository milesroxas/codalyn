"use client";

import { IconUsers } from "@tabler/icons-react";
import { WorkspaceTeamCheckoutForm } from "@/features/team/ui/workspace-team-checkout-form";
import type { TeamSeatPrice } from "@/shared/lib/billing/team-seat-price";
import { Card, CardContent } from "@/shared/ui/card";
import { TabsContent } from "@/shared/ui/tabs";

export function WorkspaceInvitesUpsellState(props: {
  organizationId: string;
  canManageBilling: boolean;
  seatFloor: number;
  seatMax: number;
  seatPrice: TeamSeatPrice | null;
}) {
  const { organizationId, canManageBilling, seatFloor, seatMax, seatPrice } = props;

  return (
    <TabsContent value="invites" className="space-y-6">
      <Card size="sm">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <IconUsers className="size-6" aria-hidden />
          </span>
          <div className="max-w-md space-y-2">
            <p className="text-base font-semibold text-foreground">Bring your team in</p>
            <p className="text-sm text-muted-foreground">
              Subscribe to Team to invite colleagues, assign roles, and track pending invites here.
            </p>
          </div>
          {canManageBilling ? (
            <WorkspaceTeamCheckoutForm
              organizationId={organizationId}
              seatFloor={seatFloor}
              seatMax={seatMax}
              seatPrice={seatPrice}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Ask a workspace admin to subscribe.</p>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
