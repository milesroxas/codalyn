import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const meta = {
  title: "UI/Select",
  component: Select,
  args: {
    defaultValue: "avif",
    disabled: false,
    onValueChange: fn(),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — uncontrolled output-format select; changes log to the Actions panel. */
export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger>
        <SelectValue placeholder="Choose format" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="avif">AVIF</SelectItem>
        <SelectItem value="webp">WebP</SelectItem>
        <SelectItem value="jpeg">JPEG</SelectItem>
      </SelectContent>
    </Select>
  ),
};

/** No `defaultValue` — the trigger shows muted placeholder text. */
export const Placeholder: Story = {
  args: { defaultValue: undefined },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger>
        <SelectValue placeholder="Choose format" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="avif">AVIF</SelectItem>
        <SelectItem value="webp">WebP</SelectItem>
        <SelectItem value="jpeg">JPEG</SelectItem>
      </SelectContent>
    </Select>
  ),
};

/** `SelectGroup` + `SelectLabel` + `SelectSeparator`, plus a disabled item. */
export const Grouped: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger>
        <SelectValue placeholder="Choose format" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Modern formats</SelectLabel>
          <SelectItem value="avif">AVIF</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Legacy formats</SelectLabel>
          <SelectItem value="jpeg">JPEG</SelectItem>
          <SelectItem value="png">PNG</SelectItem>
          <SelectItem value="svg" disabled>
            SVG (not supported)
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

/** Trigger sizes: `sm`, `default`, and block-level `full` for form fields. */
export const TriggerSizes: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col items-start gap-3">
      <Select {...args}>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Choose format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="avif">AVIF</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
        </SelectContent>
      </Select>
      <Select {...args}>
        <SelectTrigger size="default">
          <SelectValue placeholder="Choose format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="avif">AVIF</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
        </SelectContent>
      </Select>
      <Select {...args}>
        <SelectTrigger size="full">
          <SelectValue placeholder="Choose format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="avif">AVIF</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** `size="full"` trigger paired with a `Label`, as used in Beacon form fields. */
export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="output-format">Output format</Label>
      <Select {...args}>
        <SelectTrigger size="full" id="output-format">
          <SelectValue placeholder="Choose format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="avif">AVIF</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
          <SelectItem value="jpeg">JPEG</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger>
        <SelectValue placeholder="Choose format" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="avif">AVIF</SelectItem>
      </SelectContent>
    </Select>
  ),
};

/** `aria-invalid` on the trigger drives the destructive border + ring. */
export const Invalid: Story = {
  args: { defaultValue: undefined },
  render: (args) => (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Select {...args}>
        <SelectTrigger size="full" aria-invalid>
          <SelectValue placeholder="Choose format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="avif">AVIF</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-destructive">Choose an output format before syncing.</p>
    </div>
  ),
};
