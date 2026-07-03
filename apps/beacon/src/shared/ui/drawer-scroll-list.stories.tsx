import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  DrawerScrollList,
  DrawerScrollListAddActionGroup,
  DrawerScrollListAddActionRow,
} from "@/shared/ui/drawer-scroll-list";

const COMPONENT_CATALOG = [
  "Hero banner",
  "Testimonial card",
  "Pricing table",
  "Feature grid",
  "FAQ item",
  "CTA strip",
  "Logo wall",
  "Stat trio",
  "Quote block",
  "Gallery row",
  "Team member",
  "Blog teaser",
  "Newsletter signup",
  "Video embed",
];

const catalogRows = COMPONENT_CATALOG.map((name, index) => (
  <DrawerScrollListAddActionRow
    key={name}
    label={name}
    ariaLabel={index === 0 ? `${name} already added` : `Add ${name}`}
    added={index === 0}
    disabled={index === 0}
    onClick={fn()}
  />
));

const meta = {
  title: "UI/DrawerScrollList",
  component: DrawerScrollList,
  args: {
    "aria-label": "Component library",
    "data-slot": "storybook_component_catalog",
    children: catalogRows,
  },
  decorators: [
    (Story) => (
      <div className="flex h-72 w-full flex-col">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DrawerScrollList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Scrollable add-action rows inside a height-constrained drawer region; the first row is already added. */
export const Default: Story = {};

/** `loading` overlays a spinner above the list without unmounting it. */
export const Loading: Story = {
  args: {
    loading: true,
    loadingAriaLabel: "Loading components",
  },
};

/** A boundary error renders above the list region. */
export const ErrorState: Story = {
  args: {
    error: "Could not load the component library. Reopen the drawer to retry.",
  },
};

/** Empty state with a message instead of rows. */
export const Empty: Story = {
  args: {
    isEmpty: true,
    emptyMessage: "No components match your search.",
    children: null,
  },
};

/** `DrawerScrollListAddActionGroup` nests variant rows under a base component with a guide rail. */
export const VariantGroups: Story = {
  args: {
    children: (
      <>
        <DrawerScrollListAddActionGroup
          base={{ label: "Hero banner", ariaLabel: "Add Hero banner", onClick: fn() }}
          variants={[
            { id: "hero-dark", label: "Dark", ariaLabel: "Add Hero banner — Dark", onClick: fn() },
            { id: "hero-split", label: "Split", ariaLabel: "Add Hero banner — Split", onClick: fn() },
          ]}
        />
        <DrawerScrollListAddActionGroup
          base={{ label: "Testimonial card", ariaLabel: "Add Testimonial card", onClick: fn() }}
          variants={[
            { id: "testimonial-compact", label: "Compact", ariaLabel: "Add Testimonial card — Compact", onClick: fn() },
          ]}
        />
        <DrawerScrollListAddActionRow label="Pricing table" ariaLabel="Add Pricing table" onClick={fn()} />
      </>
    ),
  },
};
