"use client";

import { useState } from "react";
import { formatTeamSeatCostPreview, type TeamSeatPrice } from "@/shared/lib/billing/team-seat-price";
import { Button } from "@/shared/ui/button";
import { FormField, FormFieldHint, FormSubmitRow } from "@/shared/ui/form-field";
import { Label } from "@/shared/ui/label";
import { QuantityField } from "@/shared/ui/quantity-field";

const WORKSPACE_CHECKOUT_ACTION = "/api/billing/workspace/checkout";
const SEATS_FIELD_ID = "workspace-team-seats";

export function WorkspaceTeamCheckoutForm(props: {
  organizationId: string;
  seatFloor: number;
  seatMax: number;
  seatPrice: TeamSeatPrice | null;
}) {
  const { organizationId, seatFloor, seatMax, seatPrice } = props;
  const max = Math.max(seatFloor, seatMax);
  const [seatsInput, setSeatsInput] = useState(String(seatFloor));
  const parsedSeats = Number.parseInt(seatsInput, 10);
  const billedSeats = Math.min(max, Math.max(seatFloor, Number.isFinite(parsedSeats) ? parsedSeats : seatFloor));
  const costPreview = formatTeamSeatCostPreview(seatPrice, billedSeats);

  return (
    <form action={WORKSPACE_CHECKOUT_ACTION} method="post">
      <input type="hidden" name="organizationId" value={organizationId} />
      <FormSubmitRow>
        <FormField>
          <Label htmlFor={SEATS_FIELD_ID} size="sm">
            Seats
          </Label>
          <QuantityField
            id={SEATS_FIELD_ID}
            name="seats"
            value={seatsInput}
            min={seatFloor}
            max={max}
            required
            onValueChange={setSeatsInput}
          />
          {costPreview ? <FormFieldHint>{costPreview}</FormFieldHint> : null}
        </FormField>
        <Button type="submit">Subscribe to Team</Button>
      </FormSubmitRow>
    </form>
  );
}
