import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Plus, ScanSearch, Settings2, Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";

const CORE_VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;

const meta = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "Button",
    variant: "default",
    size: "default",
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        ...CORE_VARIANTS,
        "stepNavCurrent",
        "stepNavPast",
        "stepNavUpcoming",
        "headerMenu",
        "routeDockMuted",
        "routeDockActive",
        "actionCard",
        "emptyAction",
        "composerSlotTitle",
        "composerPaletteTile",
      ],
    },
    size: {
      control: "select",
      options: [
        "default",
        "xs",
        "2xs",
        "sm",
        "lg",
        "icon",
        "icon-xs",
        "icon-sm",
        "icon-lg",
        "dockNav",
        "dockNavFull",
        "stepNav",
        "actionCard",
        "composerPaletteTile",
        "drawerAction",
        "emptyAction",
        "emptyActionFit",
      ],
    },
    asChild: { table: { disable: true } },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — flip variant/size/disabled from the Controls panel. */
export const Default: Story = {};

/** The six core intents. Beacon-specific variants have dedicated stories below. */
export const CoreVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {CORE_VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {(["2xs", "xs", "sm", "default", "lg"] as const).map((size) => (
          <Button key={size} {...args} size={size}>
            {size}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {(["icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size) => (
          <Button key={size} {...args} size={size} aria-label={`Settings (${size})`}>
            <Settings2 />
          </Button>
        ))}
      </div>
    </div>
  ),
};

export const WithIcon: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args}>
        <Plus data-icon="inline-start" />
        Add slot
      </Button>
      <Button {...args} variant="outline">
        Continue
        <ArrowRight data-icon="inline-end" />
      </Button>
      <Button {...args} variant="destructive">
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {CORE_VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

/** Route step breadcrumb states (pinned subheader strip). */
export const StepNav: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Button variant="stepNavPast" size="stepNav" onClick={fn()}>
        Select page
      </Button>
      <span className="text-[11px] text-muted-foreground/60">/</span>
      <Button variant="stepNavCurrent" size="stepNav" onClick={fn()}>
        Compose
      </Button>
      <span className="text-[11px] text-muted-foreground/60">/</span>
      <Button variant="stepNavUpcoming" size="stepNav" onClick={fn()}>
        Sync
      </Button>
    </div>
  ),
};

/** Route footer dock tabs — muted (inactive) vs active. */
export const RouteDock: Story = {
  render: () => (
    <div className="flex w-full items-center gap-2">
      <Button variant="routeDockActive" size="dockNav" onClick={fn()}>
        Designer
      </Button>
      <Button variant="routeDockMuted" size="dockNav" onClick={fn()}>
        Composer
      </Button>
      <Button variant="routeDockMuted" size="dockNav" onClick={fn()}>
        Sync
      </Button>
    </div>
  ),
};

/**
 * Beacon composite variants that pair a `variant` with its same-named `size`
 * (actionCard, emptyAction, composerPaletteTile) plus the drawer footer action.
 */
export const PairedVariants: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Button variant="actionCard" size="actionCard" onClick={fn()}>
        <ScanSearch data-icon="inline-start" />
        Scan page for image targets
      </Button>
      <Button variant="emptyAction" size="emptyAction" onClick={fn()}>
        <Plus data-icon="inline-start" />
        Add your first slot
      </Button>
      <Button variant="emptyAction" size="emptyActionFit" onClick={fn()}>
        Learn more
      </Button>
      <Button variant="composerPaletteTile" size="composerPaletteTile" onClick={fn()}>
        <Plus data-icon="inline-start" />
        Rich text
      </Button>
      <Button size="drawerAction" onClick={fn()}>
        Save changes
      </Button>
    </div>
  ),
};

/** `asChild` renders the button styles onto another element (here an anchor). */
export const AsLink: Story = {
  args: { asChild: true, variant: "link" },
  render: (args) => (
    <Button {...args}>
      <a href="https://webflow.com" target="_blank" rel="noreferrer">
        Open Webflow docs
      </a>
    </Button>
  ),
};
