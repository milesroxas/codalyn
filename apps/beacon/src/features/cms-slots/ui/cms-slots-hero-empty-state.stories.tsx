import type { Meta, StoryObj } from "@storybook/react-vite";
import { Database, ScanSearch } from "lucide-react";
import { fn } from "storybook/test";
import {
  CmsSlotsHeroEmptyState,
  CmsSlotsRouteHeroEmptyCenter,
} from "@/features/cms-slots/ui/cms-slots-hero-empty-state";
import { EmptyAction } from "@/shared/ui/empty";

const meta = {
  title: "CmsSlots/CmsSlotsHeroEmptyState",
  component: CmsSlotsHeroEmptyState,
  args: {
    "data-slot": "cms_slots_hero_empty",
    icon: Database,
    title: "No CMS slots on this template",
    description: "Install the slot wrapper on this collection template to start composing entry-specific content.",
  },
  argTypes: {
    icon: { table: { disable: true } },
    footer: { table: { disable: true } },
  },
} satisfies Meta<typeof CmsSlotsHeroEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dashed hero card with the CMS-slot background tile behind the copy. */
export const Default: Story = {};

/** `footer` slots a call-to-action row below the description. */
export const WithFooterAction: Story = {
  args: {
    icon: ScanSearch,
    title: "Nothing to scan yet",
    description: "Beacon looks for slot wrappers on the current page. Run a scan once the template is open.",
    footer: (
      <EmptyAction width="fit" onClick={fn()}>
        <ScanSearch data-icon="inline-start" aria-hidden strokeWidth={1.75} />
        <span>Scan this page</span>
      </EmptyAction>
    ),
  },
};

/** `CmsSlotsRouteHeroEmptyCenter` vertically centers the card inside a route body. */
export const CenteredInRoute: Story = {
  render: (args) => (
    <CmsSlotsRouteHeroEmptyCenter data-slot="cms_slots_hero_empty_center">
      <CmsSlotsHeroEmptyState {...args} />
    </CmsSlotsRouteHeroEmptyCenter>
  ),
};
