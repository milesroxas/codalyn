import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreVertical, Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import {
  TileBottomPinnedLabel,
  TileButton,
  TileGridListItem,
  TileInlineLabel,
  TileOverlayButton,
  TilePanel,
  TilePresetContent,
  TileSurface,
} from "@/shared/ui/tile";

const meta = {
  title: "UI/Tile",
  component: TileButton,
  args: {
    tileVariant: "cmsUpload",
    busy: false,
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    tileVariant: {
      control: "select",
      options: ["cmsUpload", "cmsUploadCompact", "presetListInteractive", "presetListReadonly"],
    },
  },
} satisfies Meta<typeof TileButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — the full-height CMS upload tile with a bottom-pinned label. */
export const Default: Story = {
  render: (args) => (
    <TileSurface>
      <TileButton {...args} aria-label="Open Blog posts">
        <TileBottomPinnedLabel>Blog posts</TileBottomPinnedLabel>
      </TileButton>
    </TileSurface>
  ),
};

/** CMS slot tile with the Designer more-actions menu in the top-right (mirrors CmsSlotListTile). */
export const CmsUploadWithMenu: Story = {
  render: (args) => (
    <ul className="grid grid-cols-1 gap-2">
      <TileGridListItem>
        <TileSurface>
          <TileButton {...args} aria-label="Open Blog posts">
            <TileBottomPinnedLabel reserveActionSpace>Blog posts</TileBottomPinnedLabel>
          </TileButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TileOverlayButton intent="menu" align="top" aria-label="More actions for Blog posts">
                <MoreVertical aria-hidden className="size-4" strokeWidth={2} />
              </TileOverlayButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuItem onSelect={fn()}>Open</DropdownMenuItem>
              <DropdownMenuItem onSelect={fn()}>Rename slot</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={fn()}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TileSurface>
      </TileGridListItem>
    </ul>
  ),
};

/** Compact row layout for dense slot lists — inline label with a centered overlay action. */
export const CompactRow: Story = {
  args: { tileVariant: "cmsUploadCompact" },
  render: (args) => (
    <ul className="grid grid-cols-1 gap-2">
      {["Blog posts", "Team members", "Case studies"].map((label) => (
        <TileGridListItem key={label}>
          <TileSurface>
            <TileButton {...args} aria-label={`Open ${label}`}>
              <TileInlineLabel>{label}</TileInlineLabel>
            </TileButton>
            <TileOverlayButton intent="menu" align="center" aria-label={`More actions for ${label}`}>
              <MoreVertical aria-hidden className="size-4" strokeWidth={2} />
            </TileOverlayButton>
          </TileSurface>
        </TileGridListItem>
      ))}
    </ul>
  ),
};

/** Image preset tiles in a two-up grid with a destructive delete overlay (mirrors PresetListTile). */
export const PresetGrid: Story = {
  args: { tileVariant: "presetListInteractive" },
  render: (args) => (
    <ul className="grid grid-cols-2 gap-2">
      {(
        [
          { title: "Hero banner", meta: "2560 × 1440 · WebP" },
          { title: "Card thumbnail", meta: "800 × 600 · WebP" },
          { title: "Avatar", meta: "256 × 256 · PNG" },
        ] as const
      ).map((preset) => (
        <TileGridListItem key={preset.title}>
          <TileSurface>
            <TileButton {...args} aria-label={`Edit preset ${preset.title}`}>
              <TilePresetContent title={preset.title} meta={preset.meta} />
            </TileButton>
            <TileOverlayButton intent="destructive" aria-label={`Delete preset ${preset.title}`} onClick={fn()}>
              <Trash2 className="size-3.5" aria-hidden />
            </TileOverlayButton>
          </TileSurface>
        </TileGridListItem>
      ))}
    </ul>
  ),
};

/** Read-only preset panel — the non-interactive tile shape. */
export const ReadonlyPresetPanel: Story = {
  render: () => (
    <TilePanel tileVariant="presetListReadonly">
      <TilePresetContent title="Open Graph image" meta="1200 × 630 · managed by site settings" />
    </TilePanel>
  ),
};

/** Busy tile — the deferred spinner overlay appears while an open/delete request runs. */
export const Busy: Story = {
  args: { busy: true },
  render: (args) => (
    <TileSurface>
      <TileButton {...args} aria-label="Open Blog posts">
        <TileBottomPinnedLabel>Blog posts</TileBottomPinnedLabel>
      </TileButton>
    </TileSurface>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <TileSurface>
      <TileButton {...args} aria-label="Open Blog posts">
        <TileBottomPinnedLabel>Blog posts</TileBottomPinnedLabel>
      </TileButton>
    </TileSurface>
  ),
};
