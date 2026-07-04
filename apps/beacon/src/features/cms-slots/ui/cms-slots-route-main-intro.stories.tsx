import type { Meta, StoryObj } from "@storybook/react-vite";
import { CmsSlotsRouteMainIntro } from "@/features/cms-slots/ui/cms-slots-route-main-intro";

const meta = {
  title: "CmsSlots/CmsSlotsRouteMainIntro",
  component: CmsSlotsRouteMainIntro,
  args: {
    segment: "designer",
  },
  argTypes: {
    segment: { control: "radio", options: ["designer", "composer"] },
  },
} satisfies Meta<typeof CmsSlotsRouteMainIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Designer segment intro — copy for installing and structuring slots. */
export const Designer: Story = {};

/** Composer segment intro — copy for composing entry content. */
export const Composer: Story = {
  args: { segment: "composer" },
};
