import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";

const readyContext: CmsComposerEditingContextViewModel = {
  phase: "ready",
  collectionName: "Blog Posts",
  entryTitle: "Designing resilient onboarding flows",
};

const meta = {
  title: "CmsSlots/CmsSlotsComposerEditingContextCard",
  component: CmsSlotsComposerEditingContextCard,
  args: {
    context: readyContext,
    primaryField: "entry",
  },
  argTypes: {
    primaryField: { control: "radio", options: ["entry", "collection"] },
  },
} satisfies Meta<typeof CmsSlotsComposerEditingContextCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Composer flavor: the CMS entry title leads, with the collection as meta. */
export const EntryReady: Story = {};

/** A third meta line appears while a specific slot list is being edited. */
export const WithSlotList: Story = {
  args: { slotListLabel: "Post hero" },
};

/** Designer flavor (`primaryField: "collection"`): collection name leads, no entry meta. */
export const CollectionPrimary: Story = {
  args: {
    primaryField: "collection",
    context: { phase: "ready", collectionName: "Case Studies", entryTitle: null },
  },
};

/** Skeleton while the entry context resolves; reserves the slot-list line when one is expected. */
export const Loading: Story = {
  args: { context: { phase: "loading" }, slotListLabel: "Post hero" },
};

/** Static (non-CMS) page — no entry context to show. `no_tower` and `collection_unavailable` render the same shell with different copy. */
export const StaticPage: Story = {
  args: { context: { phase: "static_page" } },
};
