import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight, Component, Database, Image as ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { fn } from "storybook/test";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { StatusMessage } from "@/shared/ui/status-message";
import {
  SurfaceSummaryCard,
  SurfaceSummaryCardActionGroup,
  SurfaceSummaryCardBody,
  SurfaceSummaryCardCanvasActionRow,
  SurfaceSummaryCardEmpty,
  SurfaceSummaryCardExpandableSection,
  SurfaceSummaryCardIconActionGroup,
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRow,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardIntro,
  SurfaceSummaryCardLabel,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardNestedCard,
  SurfaceSummaryCardNestedCardCopy,
  SurfaceSummaryCardNestedCardList,
  SurfaceSummaryCardOptionRow,
  SurfaceSummaryCardOptionRowChevron,
  SurfaceSummaryCardOptionRowCopy,
  SurfaceSummaryCardOptionRows,
  SurfaceSummaryCardPageIntro,
  SurfaceSummaryCardPanel,
  SurfaceSummaryCardPanelSection,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardPending,
  SurfaceSummaryCardScanListError,
  SurfaceSummaryCardSelectCard,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowControl,
  SurfaceSummaryCardSelectRowList,
  SurfaceSummaryCardSurfaceActionsMenu,
  SurfaceSummaryCardSurfaceDisplay,
  SurfaceSummaryCardSurfaceDisplaySkeleton,
  SurfaceSummaryCardSurfaceSummary,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

const meta = {
  title: "UI/SurfaceSummaryCard",
  component: SurfaceSummaryCard,
  args: {
    state: "empty",
  },
  argTypes: {
    state: { control: "select", options: ["empty", "selected"] },
  },
} satisfies Meta<typeof SurfaceSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state — nothing selected on the canvas yet. */
export const EmptyState: Story = {
  render: (args) => (
    <SurfaceSummaryCardSurfaceSummary>
      <SurfaceSummaryCardPanelSectionLabel>Selected surface</SurfaceSummaryCardPanelSectionLabel>
      <SurfaceSummaryCard {...args}>
        <SurfaceSummaryCardEmpty>Select an image on the canvas to configure its export preset.</SurfaceSummaryCardEmpty>
      </SurfaceSummaryCard>
    </SurfaceSummaryCardSurfaceSummary>
  ),
};

/** Pending state — discovery is running against the canvas. */
export const PendingState: Story = {
  render: (args) => (
    <SurfaceSummaryCardSurfaceSummary>
      <SurfaceSummaryCardPanelSectionLabel>Selected surface</SurfaceSummaryCardPanelSectionLabel>
      <SurfaceSummaryCard {...args}>
        <SurfaceSummaryCardPending>
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
          Finding image targets on this page…
        </SurfaceSummaryCardPending>
      </SurfaceSummaryCard>
    </SurfaceSummaryCardSurfaceSummary>
  ),
};

/** Resolved surface display with an icon box and a trailing actions menu. */
export const SurfaceDisplayWithActions: Story = {
  render: () => (
    <SurfaceSummaryCardSurfaceSummary>
      <SurfaceSummaryCardPanelSectionLabel>Selected surface</SurfaceSummaryCardPanelSectionLabel>
      <SurfaceSummaryCardSurfaceDisplay frame="card">
        <SurfaceSummaryCardIconBox>
          <ImageIcon aria-hidden />
        </SurfaceSummaryCardIconBox>
        <SurfaceSummaryCardIconRowCopy>
          <SurfaceSummaryCardTitle>Hero image</SurfaceSummaryCardTitle>
          <SurfaceSummaryCardMeta>Image · div.hero-media</SurfaceSummaryCardMeta>
        </SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardSurfaceActionsMenu
          ariaLabel="More actions for Hero image"
          items={[
            { id: "rescan", label: "Rescan surface", onSelect: fn() },
            { id: "clear", label: "Clear selection", variant: "destructive", onSelect: fn() },
          ]}
        />
      </SurfaceSummaryCardSurfaceDisplay>
    </SurfaceSummaryCardSurfaceSummary>
  ),
};

/** Loading skeleton mirroring the surface display, with the optional third slot-list line. */
export const LoadingSkeleton: Story = {
  render: () => (
    <SurfaceSummaryCardSurfaceSummary>
      <SurfaceSummaryCardPanelSectionLabel>Selected surface</SurfaceSummaryCardPanelSectionLabel>
      <SurfaceSummaryCardSurfaceDisplaySkeleton loadingLabel="Loading selected surface" showSlotList />
    </SurfaceSummaryCardSurfaceSummary>
  ),
};

/** Selected card with label, body, and a paired action group (state="selected"). */
export const SelectedWithActionGroup: Story = {
  args: { state: "selected" },
  render: (args) => (
    <SurfaceSummaryCard {...args}>
      <SurfaceSummaryCardLabel>Linked collection</SurfaceSummaryCardLabel>
      <SurfaceSummaryCardBody>
        <SurfaceSummaryCardTitle>Blog posts</SurfaceSummaryCardTitle>
        <SurfaceSummaryCardMeta>14 items · synced 2 minutes ago</SurfaceSummaryCardMeta>
      </SurfaceSummaryCardBody>
      <SurfaceSummaryCardActionGroup layout="row">
        <Button type="button" variant="secondary" size="sm" onClick={fn()}>
          Open in Composer
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={fn()}>
          Unlink
        </Button>
      </SurfaceSummaryCardActionGroup>
    </SurfaceSummaryCard>
  ),
};

/** Standalone select rows with value-type chips and checkboxes (expose-props list). */
export const SelectRows: Story = {
  render: () => (
    <SurfaceSummaryCardSelectRowList density="compact">
      {(
        [
          { id: "heading", label: "Heading", group: "Hero", valueType: "Plain text", checked: true },
          { id: "body", label: "Body copy", group: "Hero", valueType: "Rich text", checked: false },
          { id: "cta-link", label: "CTA link", group: "Footer", valueType: "Link", checked: false },
        ] as const
      ).map((prop) => (
        <SurfaceSummaryCardSelectRow
          key={prop.id}
          density="compact"
          selected={prop.checked}
          htmlFor={`ssc-story-select-${prop.id}`}
        >
          <SurfaceSummaryCardIconRowCopy>
            <SurfaceSummaryCardTitle density="compact">{prop.label}</SurfaceSummaryCardTitle>
            <SurfaceSummaryCardMeta>{prop.group}</SurfaceSummaryCardMeta>
          </SurfaceSummaryCardIconRowCopy>
          <Badge variant="accent" size="sm">
            {prop.valueType}
          </Badge>
          <SurfaceSummaryCardSelectRowControl>
            <Checkbox id={`ssc-story-select-${prop.id}`} defaultChecked={prop.checked} />
          </SurfaceSummaryCardSelectRowControl>
        </SurfaceSummaryCardSelectRow>
      ))}
    </SurfaceSummaryCardSelectRowList>
  ),
};

/** Select card grouping an embedded row with an export-settings accordion (image props). */
export const SelectCardWithExpandableSection: Story = {
  render: () => (
    <SurfaceSummaryCardSelectCard selected>
      <SurfaceSummaryCardSelectRow frame="embedded" density="compact" selected htmlFor="ssc-story-expand-hero">
        <SurfaceSummaryCardIconRowCopy>
          <SurfaceSummaryCardTitle density="compact">Hero image</SurfaceSummaryCardTitle>
          <SurfaceSummaryCardMeta>Hero</SurfaceSummaryCardMeta>
        </SurfaceSummaryCardIconRowCopy>
        <Badge variant="accent" size="sm">
          Image
        </Badge>
        <SurfaceSummaryCardSelectRowControl>
          <Checkbox id="ssc-story-expand-hero" defaultChecked />
        </SurfaceSummaryCardSelectRowControl>
      </SurfaceSummaryCardSelectRow>
      <SurfaceSummaryCardExpandableSection
        defaultOpen
        title="Export Settings"
        description="Applied when this image is exported to Webflow assets."
      >
        <StatusMessage tone="warning" size="sm">
          Set the export size for this image before saving.
        </StatusMessage>
        <SurfaceSummaryCardMeta emphasis="hint">
          Preset: Hero banner · 2560 × 1440 · WebP at 80% quality.
        </SurfaceSummaryCardMeta>
      </SurfaceSummaryCardExpandableSection>
    </SurfaceSummaryCardSelectCard>
  ),
};

/** Canvas action row — prominent context label with a compact action, plus a scan error line. */
export const CanvasActionRow: Story = {
  render: () => (
    <SurfaceSummaryCardSurfaceSummary>
      <SurfaceSummaryCardCanvasActionRow
        label="3 image targets found on this page"
        actionLabel="Find on canvas"
        actionPendingLabel="Locating…"
        onAction={fn()}
      />
      <SurfaceSummaryCardCanvasActionRow
        label="Last scan 2 minutes ago"
        labelEmphasis="hint"
        actionLabel="Rescan"
        onAction={fn()}
      />
      <SurfaceSummaryCardScanListError>Scan failed. Reopen the page and try again.</SurfaceSummaryCardScanListError>
    </SurfaceSummaryCardSurfaceSummary>
  ),
};

/** Sectioned panel with an intro, nested cards, and an icon action group. */
export const PanelSections: Story = {
  render: () => (
    <SurfaceSummaryCardPanel>
      <SurfaceSummaryCardPanelSection>
        <SurfaceSummaryCardPanelSectionLabel>On this page</SurfaceSummaryCardPanelSectionLabel>
        <SurfaceSummaryCardIntro>Published slots detected on the current canvas page.</SurfaceSummaryCardIntro>
        <SurfaceSummaryCardNestedCardList>
          <SurfaceSummaryCardNestedCard>
            <SurfaceSummaryCardIconBox density="compact">
              <Database aria-hidden />
            </SurfaceSummaryCardIconBox>
            <SurfaceSummaryCardNestedCardCopy>
              <SurfaceSummaryCardTitle density="compact">Blog posts</SurfaceSummaryCardTitle>
              <SurfaceSummaryCardMeta>14 items · synced</SurfaceSummaryCardMeta>
            </SurfaceSummaryCardNestedCardCopy>
          </SurfaceSummaryCardNestedCard>
          <SurfaceSummaryCardNestedCard>
            <SurfaceSummaryCardIconBox density="compact">
              <Component aria-hidden />
            </SurfaceSummaryCardIconBox>
            <SurfaceSummaryCardNestedCardCopy>
              <SurfaceSummaryCardTitle density="compact">Team members</SurfaceSummaryCardTitle>
              <SurfaceSummaryCardMeta>6 items · 2 pending writes</SurfaceSummaryCardMeta>
            </SurfaceSummaryCardNestedCardCopy>
          </SurfaceSummaryCardNestedCard>
        </SurfaceSummaryCardNestedCardList>
      </SurfaceSummaryCardPanelSection>
      <SurfaceSummaryCardPanelSection showDivider={false} density="compact">
        <SurfaceSummaryCardIconRow>
          <SurfaceSummaryCardIconRowCopy>
            <SurfaceSummaryCardTitle density="compact">Sync status</SurfaceSummaryCardTitle>
            <SurfaceSummaryCardMeta>Last run 2 minutes ago</SurfaceSummaryCardMeta>
          </SurfaceSummaryCardIconRowCopy>
          <SurfaceSummaryCardIconActionGroup>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Run sync" onClick={fn()}>
              <RefreshCw aria-hidden />
            </Button>
          </SurfaceSummaryCardIconActionGroup>
        </SurfaceSummaryCardIconRow>
      </SurfaceSummaryCardPanelSection>
    </SurfaceSummaryCardPanel>
  ),
};

/** Callout-tone panel — dashed border draws attention without alarm. */
export const CalloutPanel: Story = {
  render: () => (
    <SurfaceSummaryCardPanel tone="callout">
      <SurfaceSummaryCardPanelSection showDivider={false}>
        <SurfaceSummaryCardPanelSectionLabel>Before you sync</SurfaceSummaryCardPanelSectionLabel>
        <SurfaceSummaryCardIntro>
          2 exposed image props are missing an export size. Items using them will be skipped.
        </SurfaceSummaryCardIntro>
      </SurfaceSummaryCardPanelSection>
    </SurfaceSummaryCardPanel>
  ),
};

/** Option rows — tappable navigation rows with copy and a trailing chevron. */
export const OptionRows: Story = {
  render: () => (
    <SurfaceSummaryCardOptionRows>
      <SurfaceSummaryCardOptionRow onClick={fn()}>
        <SurfaceSummaryCardOptionRowCopy>
          <SurfaceSummaryCardTitle density="compact">Compose from collection</SurfaceSummaryCardTitle>
          <SurfaceSummaryCardMeta>Bind slot content to an existing CMS collection.</SurfaceSummaryCardMeta>
        </SurfaceSummaryCardOptionRowCopy>
        <SurfaceSummaryCardOptionRowChevron>
          <ChevronRight aria-hidden />
        </SurfaceSummaryCardOptionRowChevron>
      </SurfaceSummaryCardOptionRow>
      <SurfaceSummaryCardOptionRow onClick={fn()}>
        <SurfaceSummaryCardOptionRowCopy>
          <SurfaceSummaryCardTitle density="compact">Start from scratch</SurfaceSummaryCardTitle>
          <SurfaceSummaryCardMeta>Define the slot fields manually.</SurfaceSummaryCardMeta>
        </SurfaceSummaryCardOptionRowCopy>
        <SurfaceSummaryCardOptionRowChevron>
          <ChevronRight aria-hidden />
        </SurfaceSummaryCardOptionRowChevron>
      </SurfaceSummaryCardOptionRow>
      <SurfaceSummaryCardOptionRow disabled onClick={fn()}>
        <SurfaceSummaryCardOptionRowCopy>
          <SurfaceSummaryCardTitle density="compact">Import from another page</SurfaceSummaryCardTitle>
          <SurfaceSummaryCardMeta>Available after this page has synced once.</SurfaceSummaryCardMeta>
        </SurfaceSummaryCardOptionRowCopy>
        <SurfaceSummaryCardOptionRowChevron>
          <ChevronRight aria-hidden />
        </SurfaceSummaryCardOptionRowChevron>
      </SurfaceSummaryCardOptionRow>
    </SurfaceSummaryCardOptionRows>
  ),
};

/** Page intro heading with an optional trailing action. */
export const PageIntro: Story = {
  render: () => (
    <SurfaceSummaryCardPageIntro
      title="Image presets"
      description="Reusable export sizes applied when images sync to Webflow."
      action={
        <Button type="button" variant="ghost" size="sm" onClick={fn()}>
          Back to list
        </Button>
      }
    />
  ),
};
