"use client";

import { useState } from "react";
import {
  getTeamSeatCostPreviewParts,
  type TeamSeatCostPreviewParts,
  type TeamSeatPrice,
} from "@/shared/lib/billing/team-seat-price";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { FormField, FormFieldHint, FormFieldInset } from "@/shared/ui/form-field";
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

function TeamSeatsField(props: {
  seatFloor: number;
  max: number;
  seatsInput: string;
  onSeatsInputChange: (next: string) => void;
}) {
  const { seatFloor, max, seatsInput, onSeatsInputChange } = props;

  return (
    <FormField className="min-w-0">
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
    </FormField>
  );
}

function TeamCheckoutSeatField(props: {
  seatFloor: number;
  max: number;
  seatsInput: string;
  onSeatsInputChange: (next: string) => void;
  costPreview: TeamSeatCostPreviewParts | null;
}) {
  const { seatFloor, max, seatsInput, onSeatsInputChange, costPreview } = props;

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <TeamSeatsField seatFloor={seatFloor} max={max} seatsInput={seatsInput} onSeatsInputChange={onSeatsInputChange} />
      {costPreview ? (
        <FormFieldHint size="md">
          <span className="tabular-nums">
            {costPreview.perSeat}/seat × {costPreview.seats}
          </span>{" "}
          ={" "}
          <span className="font-medium text-foreground tabular-nums">
            {costPreview.total}/{costPreview.interval}
          </span>
        </FormFieldHint>
      ) : null}
      {seatFloor > 1 ? <FormFieldHint>Minimum {seatFloor} seats based on current members.</FormFieldHint> : null}
    </div>
  );
}

/** Right-aligned live price readout for the order capsule: total on top, per-seat math under it. */
function TeamCheckoutPriceReadout(props: { costPreview: TeamSeatCostPreviewParts }) {
  const { costPreview } = props;

  return (
    <div className="shrink-0 text-right">
      <p className="text-lg font-semibold leading-tight tabular-nums text-foreground">
        {costPreview.total}
        <span className="text-sm font-normal text-muted-foreground">/{costPreview.interval}</span>
      </p>
      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
        {costPreview.perSeat}/seat × {costPreview.seats}
      </p>
    </div>
  );
}

type WorkspaceTeamCheckoutFormProps = {
  organizationId: string;
  seatFloor: number;
  seatMax: number;
  seatPrice: TeamSeatPrice | null;
  /** `dialog` is the seat configuration form inside the subscribe dialog. */
  layout?: "dialog" | "centered";
};

export function WorkspaceTeamCheckoutForm(props: WorkspaceTeamCheckoutFormProps) {
  const { organizationId, seatFloor, seatMax, seatPrice, layout = "centered" } = props;
  const { max, seatsInput, setSeatsInput, billedSeats } = useTeamCheckoutSeats(seatFloor, seatMax);
  const costPreview = getTeamSeatCostPreviewParts(seatPrice, billedSeats);

  if (layout === "dialog") {
    return (
      <form action={WORKSPACE_CHECKOUT_ACTION} method="post" className="space-y-4">
        <input type="hidden" name="organizationId" value={organizationId} />
        <TeamCheckoutSeatField
          seatFloor={seatFloor}
          max={max}
          seatsInput={seatsInput}
          onSeatsInputChange={setSeatsInput}
          costPreview={costPreview}
        />
        <DialogFooter>
          <Button type="submit">Continue to checkout</Button>
        </DialogFooter>
      </form>
    );
  }

  return (
    <form action={WORKSPACE_CHECKOUT_ACTION} method="post" className="w-full max-w-sm text-left">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="space-y-3 rounded-sm border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-6">
          <TeamSeatsField seatFloor={seatFloor} max={max} seatsInput={seatsInput} onSeatsInputChange={setSeatsInput} />
          {costPreview ? <TeamCheckoutPriceReadout costPreview={costPreview} /> : null}
        </div>
        {seatFloor > 1 ? <FormFieldHint>Minimum {seatFloor} seats based on current members.</FormFieldHint> : null}
        <Button type="submit" width="full">
          Continue to checkout
        </Button>
      </div>
    </form>
  );
}

export function WorkspaceTeamSubscribeUpsell(props: {
  organizationId: string;
  seatFloor: number;
  seatMax: number;
  seatPrice: TeamSeatPrice | null;
}) {
  const { organizationId, seatFloor, seatMax, seatPrice } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <FormFieldInset>
        <div className="flex items-center justify-between gap-6">
          <TeamCheckoutIntro />
          <Button type="button" onClick={() => setOpen(true)}>
            Subscribe
          </Button>
        </div>
      </FormFieldInset>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="form">
          <DialogHeader>
            <DialogTitle>Subscribe to Team</DialogTitle>
            <DialogDescription>
              Choose how many seats to bill. You can invite teammates after checkout.
            </DialogDescription>
          </DialogHeader>
          <WorkspaceTeamCheckoutForm
            organizationId={organizationId}
            seatFloor={seatFloor}
            seatMax={seatMax}
            seatPrice={seatPrice}
            layout="dialog"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
