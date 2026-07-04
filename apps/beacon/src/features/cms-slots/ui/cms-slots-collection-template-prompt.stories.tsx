import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CmsSlotsCollectionTemplateGatePrompt,
  CmsSlotsCollectionTemplatePrompt,
} from "@/features/cms-slots/ui/cms-slots-collection-template-prompt";

const meta = {
  title: "CmsSlots/CmsSlotsCollectionTemplatePrompt",
  component: CmsSlotsCollectionTemplatePrompt,
  args: {
    variant: "tile",
  },
  argTypes: {
    variant: { control: "radio", options: ["tile", "gate"] },
  },
} satisfies Meta<typeof CmsSlotsCollectionTemplatePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Tile variant — sized for a slot tile body. Clicking fires `webflow.notify` (the Storybook
 * stub logs it) since the extension cannot switch pages itself.
 */
export const Tile: Story = {};

/** Gate variant — full-width `EmptyAction` used inside gate panels. */
export const Gate: Story = {
  args: { variant: "gate" },
};

/** The full gate panel: dashed hero surface with the prompt centered over the CMS tile art. */
export const GatePanel: Story = {
  render: () => <CmsSlotsCollectionTemplateGatePrompt />,
};
