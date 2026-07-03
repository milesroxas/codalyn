import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  args: {
    defaultValue: "slots",
    onValueChange: fn(),
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default filled list — three panel sections of a Beacon page. */
export const Default: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="slots">Slots</TabsTrigger>
        <TabsTrigger value="presets">Presets</TabsTrigger>
        <TabsTrigger value="sync">Sync</TabsTrigger>
      </TabsList>
      <TabsContent value="slots">
        <p className="text-sm text-muted-foreground">3 CMS slots composed on this page.</p>
      </TabsContent>
      <TabsContent value="presets">
        <p className="text-sm text-muted-foreground">Hero — 2560w, Card — 1280w, Thumb — 640w.</p>
      </TabsContent>
      <TabsContent value="sync">
        <p className="text-sm text-muted-foreground">Last synced 2 minutes ago. No pending changes.</p>
      </TabsContent>
    </Tabs>
  ),
};

/** `variant="line"` swaps the filled pill for an underline indicator. */
export const LineVariant: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabsList variant="line">
        <TabsTrigger value="slots">Slots</TabsTrigger>
        <TabsTrigger value="presets">Presets</TabsTrigger>
        <TabsTrigger value="sync">Sync</TabsTrigger>
      </TabsList>
      <TabsContent value="slots">
        <p className="text-sm text-muted-foreground">3 CMS slots composed on this page.</p>
      </TabsContent>
      <TabsContent value="presets">
        <p className="text-sm text-muted-foreground">Hero — 2560w, Card — 1280w, Thumb — 640w.</p>
      </TabsContent>
      <TabsContent value="sync">
        <p className="text-sm text-muted-foreground">Last synced 2 minutes ago. No pending changes.</p>
      </TabsContent>
    </Tabs>
  ),
};

/** Vertical orientation stacks the triggers beside the panels. */
export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="slots">Slots</TabsTrigger>
        <TabsTrigger value="presets">Presets</TabsTrigger>
        <TabsTrigger value="sync">Sync</TabsTrigger>
      </TabsList>
      <TabsContent value="slots">
        <p className="text-sm text-muted-foreground">3 CMS slots composed on this page.</p>
      </TabsContent>
      <TabsContent value="presets">
        <p className="text-sm text-muted-foreground">Hero — 2560w, Card — 1280w, Thumb — 640w.</p>
      </TabsContent>
      <TabsContent value="sync">
        <p className="text-sm text-muted-foreground">Last synced 2 minutes ago. No pending changes.</p>
      </TabsContent>
    </Tabs>
  ),
};

/** A disabled trigger stays visible but cannot be activated. */
export const WithDisabledTab: Story = {
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="slots">Slots</TabsTrigger>
        <TabsTrigger value="presets">Presets</TabsTrigger>
        <TabsTrigger value="sync" disabled>
          Sync
        </TabsTrigger>
      </TabsList>
      <TabsContent value="slots">
        <p className="text-sm text-muted-foreground">Compose at least one slot to enable sync.</p>
      </TabsContent>
      <TabsContent value="presets">
        <p className="text-sm text-muted-foreground">Hero — 2560w, Card — 1280w, Thumb — 640w.</p>
      </TabsContent>
    </Tabs>
  ),
};
