import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import {
  CmsSlotDisplayNameDialog,
  type CmsSlotDisplayNameDialogProps,
} from "@/features/cms-slots/ui/cms-slot-display-name-dialog";
import { Button } from "@/shared/ui/button";

const meta = {
  title: "CmsSlots/CmsSlotDisplayNameDialog",
  component: CmsSlotDisplayNameDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    title: "Rename slot",
    fieldId: "cms-slot-display-name",
    value: "Team members",
    onValueChange: fn(),
    primaryLabel: "Save name",
    onPrimary: fn(),
    secondaryLabel: "Cancel",
  },
  parameters: {
    docs: { story: { inline: false, iframeHeight: 420 } },
  },
} satisfies Meta<typeof CmsSlotDisplayNameDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fully controlled — rendered open so the name field is visible without clicking. */
export const Rename: Story = {};

/** While `primaryPending`, the action shows an ellipsis and dismissal is blocked. */
export const Saving: Story = {
  args: { primaryPending: true, value: "Case studies — homepage" },
};

function TriggeredDialog(args: CmsSlotDisplayNameDialogProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(args.value);

  return (
    <CmsSlotDisplayNameDialog
      {...args}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        args.onOpenChange(nextOpen);
      }}
      value={value}
      onValueChange={(nextValue) => {
        setValue(nextValue);
        args.onValueChange(nextValue);
      }}
      onPrimary={() => {
        args.onPrimary();
        setOpen(false);
      }}
      trigger={<Button variant="outline">Rename slot</Button>}
    />
  );
}

/** The caller owns `open` and `value` — here a trigger button opens it and typing works. */
export const WithTrigger: Story = {
  render: (args) => <TriggeredDialog {...args} />,
};
