import type { Meta, StoryObj } from "@storybook/react-vite";
import { CmsSlotsAccessGate, CmsSlotsScreen } from "@/features/cms-slots";
import { beaconScreen } from "~sb/beacon-app";
import { fakePage } from "~sb/webflow-fixtures";

/**
 * Screen-level smoke stories mirroring the app's route composition (gate wrapping screen).
 * The access gate needs the Designer on a CMS collection template page; with the stubbed
 * Designer the screen settles on its install/empty states — per-panel visual states live in
 * the presentational `CmsSlots/*` stories instead.
 */
const meta = {
  title: "App/CmsSlotsScreen",
  component: CmsSlotsScreen,
  render: () => (
    <CmsSlotsAccessGate>
      <CmsSlotsScreen />
    </CmsSlotsAccessGate>
  ),
  parameters: {
    layout: "fullscreen",
    ...beaconScreen("teamAdmin", { page: fakePage("cms"), route: "/cms-slots/designer" }),
  },
} satisfies Meta<typeof CmsSlotsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Team admin on a CMS template page: Designer tab, pre-install/empty state under the stub. */
export const TeamAdminDesigner: Story = {};

/** Editor-experience member: Composer-only surface. */
export const TeamEditorComposer: Story = {
  parameters: beaconScreen("teamEditor", { page: fakePage("cms"), route: "/cms-slots/composer" }),
};

/** Gate blocks when the Designer is on a static page (not a CMS collection template). */
export const BlockedOnStaticPage: Story = {
  parameters: beaconScreen("teamAdmin", { page: fakePage("static"), route: "/cms-slots/designer" }),
};

/** Guest: gate prompts to sign in / connect Tower before CMS Slots. */
export const Guest: Story = {
  parameters: beaconScreen("guest", {
    guestChosen: true,
    page: fakePage("cms"),
    route: "/cms-slots/composer",
  }),
};
