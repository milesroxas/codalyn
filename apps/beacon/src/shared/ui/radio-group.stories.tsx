import type { Meta, StoryObj } from "@storybook/react-vite";
import { Crop, Expand, Frame } from "lucide-react";
import { fn } from "storybook/test";
import { Label } from "@/shared/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupTileGrid,
  RadioGroupTileOption,
  RadioGroupTileOptionControl,
  RadioGroupTileOptionCopy,
  RadioGroupTileOptionDescription,
  RadioGroupTileOptionIcon,
  RadioGroupTileOptionTitle,
} from "@/shared/ui/radio-group";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  args: {
    defaultValue: "avif",
    disabled: false,
    onValueChange: fn(),
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const OUTPUT_FORMATS = [
  { value: "avif", label: "AVIF" },
  { value: "webp", label: "WebP" },
  { value: "jpeg", label: "JPEG" },
] as const;

/** Playground — uncontrolled output-format picker; selections log to the Actions panel. */
export const Default: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      {OUTPUT_FORMATS.map((format) => (
        <div key={format.value} className="flex items-center gap-2">
          <RadioGroupItem value={format.value} id={`format-${format.value}`} />
          <Label htmlFor={`format-${format.value}`}>{format.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};

/** `disabled` on the root dims and locks every item. */
export const DisabledGroup: Story = {
  args: { disabled: true },
  render: (args) => (
    <RadioGroup {...args}>
      {OUTPUT_FORMATS.map((format) => (
        <div key={format.value} className="flex items-center gap-2">
          <RadioGroupItem value={format.value} id={`format-locked-${format.value}`} />
          <Label htmlFor={`format-locked-${format.value}`}>{format.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};

/** A single item can be disabled independently. */
export const DisabledItem: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      {OUTPUT_FORMATS.map((format) => (
        <div key={format.value} className="flex items-center gap-2">
          <RadioGroupItem value={format.value} id={`format-item-${format.value}`} />
          <Label htmlFor={`format-item-${format.value}`}>{format.label}</Label>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <RadioGroupItem value="png" id="format-item-png" disabled />
        <Label htmlFor="format-item-png">
          PNG
          <span className="font-normal text-muted-foreground">(plan required)</span>
        </Label>
      </div>
    </RadioGroup>
  ),
};

/** `aria-invalid` on items drives the destructive border + ring until a choice is made. */
export const Invalid: Story = {
  args: { defaultValue: undefined },
  render: (args) => (
    <div className="flex w-full flex-col gap-2">
      <RadioGroup {...args}>
        {OUTPUT_FORMATS.map((format) => (
          <div key={format.value} className="flex items-center gap-2">
            <RadioGroupItem value={format.value} id={`format-required-${format.value}`} aria-invalid />
            <Label htmlFor={`format-required-${format.value}`}>{format.label}</Label>
          </div>
        ))}
      </RadioGroup>
      <p className="text-xs text-destructive">Choose an output format before syncing.</p>
    </div>
  ),
};

/** `RadioGroupTileGrid` + tile option parts — the icon tile picker (here: image fit mode). */
export const TileGrid: Story = {
  args: { defaultValue: "cover" },
  render: (args) => (
    <RadioGroupTileGrid {...args}>
      <RadioGroupTileOption htmlFor="fit-contain">
        <RadioGroupTileOptionControl value="contain" id="fit-contain" />
        <RadioGroupTileOptionIcon>
          <Frame className="size-5" aria-hidden />
        </RadioGroupTileOptionIcon>
        <RadioGroupTileOptionCopy>
          <RadioGroupTileOptionTitle>Contain</RadioGroupTileOptionTitle>
          <RadioGroupTileOptionDescription>Whole image visible</RadioGroupTileOptionDescription>
        </RadioGroupTileOptionCopy>
      </RadioGroupTileOption>
      <RadioGroupTileOption htmlFor="fit-cover">
        <RadioGroupTileOptionControl value="cover" id="fit-cover" />
        <RadioGroupTileOptionIcon>
          <Crop className="size-5" aria-hidden />
        </RadioGroupTileOptionIcon>
        <RadioGroupTileOptionCopy>
          <RadioGroupTileOptionTitle>Cover</RadioGroupTileOptionTitle>
          <RadioGroupTileOptionDescription>Fill, may crop</RadioGroupTileOptionDescription>
        </RadioGroupTileOptionCopy>
      </RadioGroupTileOption>
      <RadioGroupTileOption htmlFor="fit-fill">
        <RadioGroupTileOptionControl value="fill" id="fit-fill" />
        <RadioGroupTileOptionIcon>
          <Expand className="size-5" aria-hidden />
        </RadioGroupTileOptionIcon>
        <RadioGroupTileOptionCopy>
          <RadioGroupTileOptionTitle>Fill</RadioGroupTileOptionTitle>
          <RadioGroupTileOptionDescription>Stretch to slot</RadioGroupTileOptionDescription>
        </RadioGroupTileOptionCopy>
      </RadioGroupTileOption>
    </RadioGroupTileGrid>
  ),
};
