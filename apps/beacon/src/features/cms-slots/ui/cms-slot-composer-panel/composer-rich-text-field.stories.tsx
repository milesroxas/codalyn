import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ComposerRichTextField } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-rich-text-field";

const meta = {
  title: "CmsSlots/ComposerRichTextField",
  component: ComposerRichTextField,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    inputId: "composer-rich-text",
    ep: { propId: "body", label: "Body", valueType: "richText" },
    value: "<h3>Launch week</h3><p>Three <strong>new</strong> slots, one <em>afternoon</em>.</p>",
    busy: false,
    onChange: fn(),
  },
} satisfies Meta<typeof ComposerRichTextField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full form: the Lexical WYSIWYG editor, shown in builds that bundle it. */
export const RichTextEditor: Story = {
  args: { richTextEditorAvailable: true },
};

/**
 * Reduced form shipped in Marketplace bundles (`VITE_BEACON_RICH_TEXT_EDITOR_ENABLED` unset): the same
 * HTML edited directly in a textarea, with Lexical absent from the artifact entirely.
 */
export const HtmlTextarea: Story = {
  args: { richTextEditorAvailable: false },
};

/** Saving in progress — the field is disabled in both forms. */
export const Busy: Story = {
  args: { richTextEditorAvailable: false, busy: true },
};
