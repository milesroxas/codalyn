import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown, RefreshCw } from "lucide-react";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/shared/ui/button-group";
import { Input } from "@/shared/ui/input";

const meta = {
  title: "UI/ButtonGroup",
  component: ButtonGroup,
  args: {
    orientation: "horizontal",
  },
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — adjacent outline buttons fuse into one bar. */
export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline" onClick={fn()}>
        Sync selected
      </Button>
      <Button variant="outline" onClick={fn()}>
        Sync page
      </Button>
      <Button variant="outline" onClick={fn()}>
        Sync all
      </Button>
    </ButtonGroup>
  ),
};

/** Split button — primary action plus a separated chevron for more sync options. */
export const SplitButton: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button onClick={fn()}>
        <RefreshCw data-icon="inline-start" aria-hidden />
        Sync page
      </Button>
      <ButtonGroupSeparator />
      <Button size="icon" aria-label="More sync options" onClick={fn()}>
        <ChevronDown aria-hidden />
      </Button>
    </ButtonGroup>
  ),
};

/** `ButtonGroupText` labels an input inside the group (input stretches via `flex-1`). */
export const WithTextAndInput: Story = {
  render: (args) => (
    <div className="w-full max-w-xs">
      <ButtonGroup {...args}>
        <ButtonGroupText>Max width</ButtonGroupText>
        <Input type="number" placeholder="2560" min={0} step={20} aria-label="Max width (px)" onChange={fn()} />
        <Button variant="outline" onClick={fn()}>
          Apply
        </Button>
      </ButtonGroup>
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline" onClick={fn()}>
        Move slot up
      </Button>
      <Button variant="outline" onClick={fn()}>
        Move slot down
      </Button>
      <Button variant="outline" onClick={fn()}>
        Remove slot
      </Button>
    </ButtonGroup>
  ),
};

/** Sibling groups inside a group keep a gap between them instead of fusing. */
export const NestedGroups: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <ButtonGroup>
        <Button variant="outline" size="sm" onClick={fn()}>
          Scan page
        </Button>
        <Button variant="outline" size="sm" onClick={fn()}>
          Rescan
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" size="sm" onClick={fn()}>
          Publish
        </Button>
      </ButtonGroup>
    </ButtonGroup>
  ),
};
