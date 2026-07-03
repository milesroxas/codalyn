import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { fn } from "storybook/test";
import { RichTextEditor } from "@/shared/ui/rich-text-editor";

/** Realistic CMS-slot body copy — exercises every default feature: h2/h3, bold, italic, underline, lists, link, quote. */
const CMS_BODY_HTML = [
  "<h2>Meet the new onboarding flow</h2>",
  "<p>We rebuilt onboarding around <strong>guided checklists</strong> so new teammates publish their first page in <em>under an hour</em>.</p>",
  "<h3>What changed</h3>",
  "<ul><li>Reusable <u>slot presets</u> for hero, feature grid, and FAQ sections</li><li>Inline validation before a sync ever reaches Webflow</li><li>One-click rollback for any published batch</li></ul>",
  "<h3>Getting started</h3>",
  "<ol><li>Open the Composer and pick a page</li><li>Bind each slot to a CMS field</li><li>Review the diff, then sync</li></ol>",
  '<p>Read the full breakdown in the <a href="https://university.webflow.com/">Webflow University guide</a>.</p>',
  "<blockquote>Content editors publish twice as fast when the layout is locked and the copy is theirs.</blockquote>",
].join("");

/** Short teaser copy for the compact variant (dense composer rows). */
const CMS_TEASER_HTML =
  '<p><strong>Spring launch:</strong> the new pricing page ships <em>Friday</em>. Draft your section copy in the <a href="https://webflow.com/dashboard">CMS</a> before Thursday\'s freeze.</p>';

/** Inline-only copy for the restricted-config story — no headings, lists, or quotes. */
const CMS_INLINE_HTML =
  '<p>Trusted by <strong>2,400+ marketing teams</strong> to keep <em>every landing page</em> on brand. <a href="https://webflow.com/customers">See customer stories</a>.</p>';

/**
 * The editor is controlled (`value` in, `onChange` out), so stories hold the HTML in local state and forward every
 * change to the `onChange` spy arg — edits show up in the Actions panel as the serialized HTML. Remounts when the
 * `value` arg itself changes (via the Controls panel) so a new seed re-imports. The outer div is layout-only.
 */
function ControlledRichTextEditor({ value, onChange, ...props }: ComponentProps<typeof RichTextEditor>) {
  const [html, setHtml] = useState(value);
  return (
    <div className="w-full">
      <RichTextEditor
        {...props}
        value={html}
        onChange={(next) => {
          setHtml(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const meta = {
  title: "UI/RichTextEditor",
  component: RichTextEditor,
  args: {
    value: "",
    placeholder: "Write…",
    disabled: false,
    variant: "default",
    "aria-label": "Rich text body",
    onChange: fn(),
    onBlur: fn(),
  },
  argTypes: {
    variant: { control: "select", options: ["default", "compact"] },
    config: { control: false },
    className: { table: { disable: true } },
    id: { table: { disable: true } },
  },
  render: (args) => <ControlledRichTextEditor key={args.value} {...args} />,
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty editor showing the placeholder. Type to see debounced HTML land in the Actions panel. */
export const Default: Story = {
  args: { placeholder: "Write the body copy for this slot…" },
};

/** Pre-filled CMS body copy covering every default toolbar feature: headings, inline marks, both lists, link, quote. */
export const WithContent: Story = {
  args: { value: CMS_BODY_HTML },
};

/** `variant="compact"` — tighter padding and a lower max height for dense composer rows. */
export const Compact: Story = {
  args: {
    variant: "compact",
    value: CMS_TEASER_HTML,
    "aria-label": "Teaser copy",
  },
};

/** Disabled with content: toolbar controls are inert and the surface is read-only at reduced opacity. */
export const Disabled: Story = {
  args: {
    disabled: true,
    value: CMS_BODY_HTML,
  },
};

/**
 * `config.features` restricts the toolbar to an allowlist (in display order). Here an inline-only editor for short
 * CMS fields: bold, italic, and link — no block-level formatting.
 */
export const RestrictedConfig: Story = {
  args: {
    config: { features: ["bold", "italic", "link"] },
    value: CMS_INLINE_HTML,
    "aria-label": "Inline copy",
    placeholder: "Write a short teaser…",
  },
};
