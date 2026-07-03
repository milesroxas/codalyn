import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import { ConfirmDestructiveDialog, type ConfirmDestructiveDialogProps } from "@/shared/ui/confirm-destructive-dialog";

const meta = {
  title: "UI/ConfirmDestructiveDialog",
  component: ConfirmDestructiveDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    title: "Delete preset?",
    description: "This permanently removes “Hero — 2560w” from every page that uses it. This cannot be undone.",
    cancelLabel: "Cancel",
    confirmLabel: "Delete preset",
    busy: false,
    onConfirm: fn(),
  },
} satisfies Meta<typeof ConfirmDestructiveDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fully controlled — rendered open so the confirm surface is visible without clicking. */
export const Open: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
};

/** While `busy`, dismissal is blocked and both actions are disabled (e.g. delete in flight). */
export const Busy: Story = {
  args: { busy: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
};

function TriggeredConfirm(args: ConfirmDestructiveDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete preset
      </Button>
      <ConfirmDestructiveDialog
        {...args}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          args.onOpenChange(nextOpen);
        }}
        onConfirm={() => {
          args.onConfirm();
          setOpen(false);
        }}
      />
    </>
  );
}

/** The caller owns `open` — here a destructive button opens the dialog and confirm closes it. */
export const Triggered: Story = {
  render: (args) => <TriggeredConfirm {...args} />,
};
