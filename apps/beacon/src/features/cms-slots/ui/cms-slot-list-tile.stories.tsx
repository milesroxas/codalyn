import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CmsSlotListTile, CmsSlotPublishedSlotTile } from "@/features/cms-slots/ui/cms-slot-list-tile";

const meta = {
  title: "CmsSlots/CmsSlotListTile",
  component: CmsSlotListTile,
  // TileGridListItem renders an <li>; the wrapper mirrors the grid the feature renders into.
  decorators: [
    (Story) => (
      <ul className="grid grid-cols-1 gap-2">
        <Story />
      </ul>
    ),
  ],
  args: {
    label: "Blog posts",
    disabled: false,
    busy: false,
    compact: false,
    onOpen: fn(),
    onRequestDelete: fn(),
    onRequestRename: fn(),
  },
} satisfies Meta<typeof CmsSlotListTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full upload-card layout with the Designer more-actions menu (Open / Rename / Delete). */
export const Default: Story = {};

/** Slim row layout for dense slot lists. */
export const Compact: Story = {
  args: { compact: true, label: "Team members" },
};

/** `busy` shows the tile's in-flight treatment (open/delete/rename pending). */
export const Busy: Story = {
  args: { busy: true, label: "Case studies" },
};

/** Without rename/delete callbacks the more-actions menu is omitted (read-only contexts). */
export const WithoutActionsMenu: Story = {
  args: { label: "Press mentions", onRequestDelete: undefined, onRequestRename: undefined },
};

/** `CmsSlotPublishedSlotTile` derives the label: persisted display name wins, else the slug. */
export const PublishedSlot: Story = {
  render: () => (
    <>
      <CmsSlotPublishedSlotTile
        dataList="beacon-blog-posts"
        displayName="Blog posts — hero"
        disabled={false}
        opening={false}
        deleting={false}
        renaming={false}
        compact
        onOpen={fn()}
        onRequestDelete={fn()}
        onRequestRename={fn()}
      />
      <CmsSlotPublishedSlotTile
        dataList="beacon-case-studies"
        displayName={null}
        disabled={false}
        opening={false}
        deleting={false}
        renaming={false}
        compact
        onOpen={fn()}
        onRequestDelete={fn()}
        onRequestRename={fn()}
      />
    </>
  ),
};
