import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { fn } from "storybook/test";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const meta = {
  title: "UI/DropdownMenu",
  component: DropdownMenu,
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Slot actions menu — label, items with icons, separator, destructive item. */
export const Default: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Slot actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Hero image slot</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={fn()}>
          <Pencil />
          Rename
          <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={fn()}>
          <Copy />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={fn()}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Rendered open via `defaultOpen` so the menu surface is visible without clicking. */
export const Open: Story = {
  ...Default,
  args: { defaultOpen: true },
  parameters: { docs: { story: { inline: false, iframeHeight: 400 } } },
};

function CheckboxItemsExample(args: ComponentProps<typeof DropdownMenu>) {
  const [showSynced, setShowSynced] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  return (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Filter slots</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Show</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked={showSynced} onCheckedChange={setShowSynced}>
          Synced slots
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={showDrafts} onCheckedChange={setShowDrafts}>
          Draft slots
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived} disabled>
          Archived slots
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Checkbox items with a checked, unchecked, and disabled entry. */
export const CheckboxItems: Story = {
  render: (args) => <CheckboxItemsExample {...args} />,
};

function RadioItemsExample(args: ComponentProps<typeof DropdownMenu>) {
  const [preset, setPreset] = useState("hero-2560");

  return (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Image preset</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Preset</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preset} onValueChange={setPreset}>
          <DropdownMenuRadioItem value="hero-2560">Hero — 2560w</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="card-1280">Card — 1280w</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="thumb-640">Thumb — 640w</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Radio group for a single-choice preset picker. */
export const RadioItems: Story = {
  render: (args) => <RadioItemsExample {...args} />,
};

/** Submenu for moving a slot to another page. */
export const WithSubmenu: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Slot actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={fn()}>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to page</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={fn()}>Home</DropdownMenuItem>
            <DropdownMenuItem onSelect={fn()}>About</DropdownMenuItem>
            <DropdownMenuItem onSelect={fn()}>Pricing</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={fn()}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
