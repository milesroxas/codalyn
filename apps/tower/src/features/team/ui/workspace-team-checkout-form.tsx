"use client";

import { useState } from "react";
import { formatTeamSeatCostPreview, type TeamSeatPrice } from "@/shared/lib/billing/team-seat-price";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { FormField, FormFieldHint, FormFieldInset, FormSubmitRow } from "@/shared/ui/form-field";
import { Label } from "@/shared/ui/label";
import { QuantityField } from "@/shared/ui/quantity-field";

const WORKSPACE_CHECKOUT_ACTION = "/api/billing/workspace/checkout";
const SEATS_FIELD_ID = "workspace-team-seats";

function useTeamCheckoutSeats(seatFloor: number, seatMax: number) {
  const max = Math.max(seatFloor, seatMax);
  const [seatsInput, setSeatsInput] = useState(String(seatFloor));
  const parsedSeats = Number.parseInt(seatsInput, 10);
  const billedSeats = Math.min(max, Math.max(seatFloor, Number.isFinite(parsedSeats) ? parsedSeats : seatFloor));

  return { max, seatsInput, setSeatsInput, billedSeats };
}

function TeamCheckoutIntro() {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">Subscribe to Team</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Choose how many seats to bill. You can invite teammates after checkout.
      </p>
    </div>
  );
}

function TeamCheckoutSeatField(props: {
  seatFloor: number;
  max: number;
  seatsInput: string;
  onSeatsInputChange: (next: string) => void;
  costPreview: string | null;
}) {
  const { seatFloor, max, seatsInput, onSeatsInputChange, costPreview } = props;

  return (
    <FormField className="min-w-0 flex-1">
      <Label htmlFor={SEATS_FIELD_ID}>Team seats</Label>
      <QuantityField
        id={SEATS_FIELD_ID}
        name="seats"
        value={seatsInput}
        min={seatFloor}
        max={max}
        required
        onValueChange={onSeatsInputChange}
      />
      {costPreview ? <FormFieldHint size="md">{costPreview}</FormFieldHint> : null}
      {seatFloor > 1 ? <FormFieldHint>Minimum {seatFloor} seats based on current members.</FormFieldHint> : null}
    </FormField>
  );
}

export function WorkspaceTeamCheckoutForm(props: {
  organizationId: string;
  seatFloor: number;
  seatMax: number;
  seatPrice: TeamSeatPrice | null;
  /** `inset` groups the upgrade flow; `centered` is for empty-state cards without extra chrome. */
  presentation?: "inset" | "centered";
}) {
  const { organizationId, seatFloor, seatMax, seatPrice, presentation = "inset" } = props;
  const { max, seatsInput, setSeatsInput, billedSeats } = useTeamCheckoutSeats(seatFloor, seatMax);
  const costPreview = formatTeamSeatCostPreview(seatPrice, billedSeats);

  const seatField = (
    <TeamCheckoutSeatField
      seatFloor={seatFloor}
      max={max}
      seatsInput={seatsInput}
      onSeatsInputChange={setSeatsInput}
      costPreview={costPreview}
    />
  );

  const submitButton = (
    <div className="w-full shrink-0 @[28rem]/form-inset:w-auto">
      <Button type="submit" width="full">
        Continue to checkout
      </Button>
    </div>
  );

  return (
    <form
      action={WORKSPACE_CHECKOUT_ACTION}
      method="post"
      className={cn(presentation === "centered" && "w-full max-w-xs")}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      {presentation === "inset" ? (
        <FormFieldInset>
          <div className="grid gap-4 @[28rem]/form-inset:grid-cols-[minmax(0,1fr)_auto] @[28rem]/form-inset:items-end @[28rem]/form-inset:gap-6">
            <TeamCheckoutIntro />
            <FormSubmitRow className="w-full min-w-0 @[28rem]/form-inset:min-w-[17.5rem]">
              {seatField}
              {submitButton}
            </FormSubmitRow>
          </div>
        </FormFieldInset>
      ) : (
        <div className="space-y-4">
          {seatField}
          {submitButton}
        </div>
      )}
    </form>
  );
}
