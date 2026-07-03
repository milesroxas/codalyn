import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, FormFieldsCard } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const meta = {
  title: "UI/Card",
  component: Card,
  args: {
    size: "default",
    tone: "default",
  },
  argTypes: {
    size: { control: "select", options: ["default", "sm"] },
    tone: { control: "select", options: ["default", "warning"] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — flip size/tone from the Controls panel. */
export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Image presets</CardTitle>
        <CardDescription>Reusable export sizes for this site.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Presets resize and compress images when they are exported to Webflow assets.
        </p>
      </CardContent>
    </Card>
  ),
};

/** `sm` tightens padding and drops the title to 14px — for stacked panel sections. */
export const Small: Story = {
  args: { size: "sm" },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Sync summary</CardTitle>
        <CardDescription>Last run 2 minutes ago.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">14 items synced, 2 skipped for empty image fields.</p>
      </CardContent>
    </Card>
  ),
};

/** Warning tone — subtle amber wash for a notice, never a heavy fill. */
export const WarningTone: Story = {
  args: { tone: "warning" },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Unsaved export settings</CardTitle>
        <CardDescription>Set an export size for the hero image before saving this slot.</CardDescription>
      </CardHeader>
    </Card>
  ),
};

/** `FormFieldsCard` — compact shell for stacked form controls. */
export const FormFields: Story = {
  render: () => (
    <FormFieldsCard>
      <div className="flex flex-col gap-2">
        <Label htmlFor="card-story-preset-name">Preset name</Label>
        <Input id="card-story-preset-name" defaultValue="Hero banner" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="card-story-preset-width">Max width (px)</Label>
        <Input id="card-story-preset-width" inputMode="numeric" defaultValue="2560" />
      </div>
    </FormFieldsCard>
  ),
};
