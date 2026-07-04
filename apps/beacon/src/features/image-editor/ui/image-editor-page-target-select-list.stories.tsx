import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetSelectList } from "@/features/image-editor/ui/image-editor-page-target-select-list";

/** The list renders from id/kind/label only — it never touches the Designer element reference. */
const placeholderElement = {} as unknown as AnyElement;

const pageTargets: ImagePageTarget[] = [
  {
    id: "image-0",
    kind: "image",
    element: placeholderElement,
    label: "Image",
  },
  {
    id: "comp-1",
    kind: "component",
    element: placeholderElement,
    label: "Hero Banner",
    imagePropId: "prop-hero-background",
    imagePropLabel: "Background image",
  },
  {
    id: "comp-2",
    kind: "component",
    element: placeholderElement,
    label: "Team Card",
    imagePropId: "prop-team-avatar",
    imagePropLabel: "Avatar",
  },
];

const meta = {
  title: "ImageEditor/ImagePageTargetSelectList",
  component: ImagePageTargetSelectList,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    idPrefix: "image-target-select",
    targets: pageTargets,
    selectedTarget: pageTargets[1] ?? null,
    onSelectTarget: fn(),
  },
} satisfies Meta<typeof ImagePageTargetSelectList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Scan results with a component image field selected — image elements and component props mix. */
export const ComponentFieldSelected: Story = {};

/** Nothing chosen yet — every radio row is unselected. */
export const NoSelection: Story = {
  args: { selectedTarget: null },
};
