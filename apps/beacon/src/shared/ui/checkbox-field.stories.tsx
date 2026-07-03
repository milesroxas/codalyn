import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { CheckboxField, CheckboxFieldItem, CheckboxFieldList } from "@/shared/ui/checkbox-field";

const meta = {
  title: "UI/CheckboxField",
  component: CheckboxField,
  args: {
    id: "optimize-on-publish",
    label: "Optimize on publish",
    checked: true,
    disabled: false,
    onCheckedChange: fn(),
  },
  argTypes: {
    label: { control: "text" },
    meta: { control: "text" },
  },
} satisfies Meta<typeof CheckboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — `CheckboxField` is controlled, so the story syncs `checked` back into args. */
export const Default: Story = {
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <CheckboxField
        {...args}
        onCheckedChange={(value) => {
          args.onCheckedChange(value);
          updateArgs({ checked: value });
        }}
      />
    );
  },
};

/** Trailing `meta` renders as quiet mono text after the label. */
export const WithMeta: Story = {
  args: { meta: "12 images" },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <CheckboxField
        {...args}
        onCheckedChange={(value) => {
          args.onCheckedChange(value);
          updateArgs({ checked: value });
        }}
      />
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true, label: "Strip EXIF metadata", meta: "plan required" },
};

/** Long labels wrap while the control stays aligned to the first line. */
export const LongLabel: Story = {
  args: {
    id: "confirm-overwrite",
    label: "I understand syncing replaces the published asset on every page that references this slot",
    checked: false,
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <div className="w-full max-w-xs">
        <CheckboxField
          {...args}
          onCheckedChange={(value) => {
            args.onCheckedChange(value);
            updateArgs({ checked: value });
          }}
        />
      </div>
    );
  },
};

const SYNC_PAGES = [
  { id: "home", label: "Home", meta: "8 slots" },
  { id: "about", label: "About", meta: "3 slots" },
  { id: "blog", label: "Blog index", meta: "14 slots" },
  { id: "pricing", label: "Pricing", meta: "2 slots" },
] as const;

function PageSelectionDemo() {
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set(["home", "blog"]));

  return (
    <CheckboxFieldList>
      {SYNC_PAGES.map((page) => (
        <CheckboxFieldItem key={page.id}>
          <CheckboxField
            id={`sync-page-${page.id}`}
            label={page.label}
            meta={page.meta}
            checked={selected.has(page.id)}
            onCheckedChange={(checked) => {
              setSelected((previous) => {
                const next = new Set(previous);
                if (checked) {
                  next.add(page.id);
                } else {
                  next.delete(page.id);
                }
                return next;
              });
            }}
          />
        </CheckboxFieldItem>
      ))}
    </CheckboxFieldList>
  );
}

/** `CheckboxFieldList` + `CheckboxFieldItem` — a multi-select list (pages to include in a sync). */
export const FieldList: Story = {
  render: () => <PageSelectionDemo />,
};
