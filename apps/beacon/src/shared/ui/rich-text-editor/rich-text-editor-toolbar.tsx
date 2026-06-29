import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { RichTextLinkButton } from "@/shared/ui/rich-text-editor/plugins/link-plugin";
import {
  richTextCommands,
  useRichTextEditor,
  useToolbarState,
} from "@/shared/ui/rich-text-editor/plugins/toolbar-state-plugin";
import type { RichTextFeature } from "@/shared/ui/rich-text-editor/rich-text-editor-config";
import { Separator } from "@/shared/ui/separator";
import { toggleVariants } from "@/shared/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

type ToggleButtonProps = {
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function RichTextToolbarButton({ icon: Icon, label, active, disabled, onClick }: ToggleButtonProps): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          // Toolbar buttons sit inside contentEditable; mousedown default would move the caret out of the selection
          // before the command runs, so the format would apply to nothing.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled}
          data-state={active ? "on" : "off"}
          aria-pressed={active}
          aria-label={label}
          className={cn(toggleVariants({ variant: "segmented", size: "xs" }))}
        >
          <Icon aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Logical cluster for a feature; a vertical separator is drawn whenever the cluster changes between two features. */
function featureGroup(feature: RichTextFeature): string {
  switch (feature) {
    case "bold":
    case "italic":
    case "underline":
      return "inline";
    case "h2":
    case "h3":
    case "quote":
      return "block";
    case "bulletList":
    case "orderedList":
      return "list";
    case "link":
      return "link";
    case "clear":
      return "clear";
  }
}

type RichTextToolbarProps = {
  features: readonly RichTextFeature[];
  disabled?: boolean;
};

/**
 * Toolbar built from shared/ui primitives only (no new chrome): standalone toggle buttons styled with
 * {@link toggleVariants}, `Separator` between clusters, `Tooltip` on each, lucide icons. Pressed state comes from
 * {@link useToolbarState} — the single source of truth (plan §6.4). Must render inside a `LexicalComposer`.
 */
export function RichTextToolbar({ features, disabled = false }: RichTextToolbarProps): React.JSX.Element {
  const editor = useRichTextEditor();
  const state = useToolbarState();
  const off = disabled || !state.canEdit;

  const renderFeature = (feature: RichTextFeature) => {
    switch (feature) {
      case "bold":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={Bold}
            label="Bold"
            active={state.bold}
            disabled={disabled}
            onClick={() => richTextCommands.toggleInline(editor, "bold")}
          />
        );
      case "italic":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={Italic}
            label="Italic"
            active={state.italic}
            disabled={disabled}
            onClick={() => richTextCommands.toggleInline(editor, "italic")}
          />
        );
      case "underline":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={Underline}
            label="Underline"
            active={state.underline}
            disabled={disabled}
            onClick={() => richTextCommands.toggleInline(editor, "underline")}
          />
        );
      case "h2":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={Heading2}
            label="Heading 2"
            active={state.blockType === "h2"}
            disabled={off}
            onClick={() => richTextCommands.toggleHeading(editor, "h2", state.blockType === "h2")}
          />
        );
      case "h3":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={Heading3}
            label="Heading 3"
            active={state.blockType === "h3"}
            disabled={off}
            onClick={() => richTextCommands.toggleHeading(editor, "h3", state.blockType === "h3")}
          />
        );
      case "bulletList":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={List}
            label="Bullet list"
            active={state.blockType === "bullet"}
            disabled={off}
            onClick={() => richTextCommands.toggleBulletList(editor, state.blockType === "bullet")}
          />
        );
      case "orderedList":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={ListOrdered}
            label="Numbered list"
            active={state.blockType === "number"}
            disabled={off}
            onClick={() => richTextCommands.toggleOrderedList(editor, state.blockType === "number")}
          />
        );
      case "quote":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={Quote}
            label="Quote"
            active={state.blockType === "quote"}
            disabled={off}
            onClick={() => richTextCommands.toggleQuote(editor, state.blockType === "quote")}
          />
        );
      case "link":
        return <RichTextLinkButton key={feature} active={state.isLink} currentUrl={state.linkUrl} disabled={off} />;
      case "clear":
        return (
          <RichTextToolbarButton
            key={feature}
            icon={RemoveFormatting}
            label="Clear formatting"
            active={false}
            disabled={off}
            onClick={() => richTextCommands.clearFormatting(editor)}
          />
        );
    }
  };

  return (
    <TooltipProvider>
      <div data-slot="rich-text-toolbar" className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
        {features.map((feature, index) => {
          const needsSeparator = index > 0 && featureGroup(feature) !== featureGroup(features[index - 1]);
          return (
            <span key={feature} className="contents">
              {needsSeparator ? <Separator orientation="vertical" className="mx-0.5 h-5" /> : null}
              {renderFeature(feature)}
            </span>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
