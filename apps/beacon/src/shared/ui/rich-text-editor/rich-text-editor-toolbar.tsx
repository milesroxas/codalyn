import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  type LucideIcon,
  MoreHorizontal,
  Quote,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useToolbarOverflow } from "@/shared/ui/rich-text-editor/lib/use-toolbar-overflow";
import { RichTextLinkButton, RichTextLinkMenuItem } from "@/shared/ui/rich-text-editor/plugins/link-plugin";
import {
  richTextCommands,
  type ToolbarState,
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

/** Static presentation metadata per feature; the logical `group` drives separator placement (block↔inline↔list). */
const FEATURE_META: Record<RichTextFeature, { icon: LucideIcon; label: string; group: string }> = {
  bold: { icon: Bold, label: "Bold", group: "inline" },
  italic: { icon: Italic, label: "Italic", group: "inline" },
  underline: { icon: Underline, label: "Underline", group: "inline" },
  h2: { icon: Heading2, label: "Heading 2", group: "block" },
  h3: { icon: Heading3, label: "Heading 3", group: "block" },
  bulletList: { icon: List, label: "Bullet list", group: "list" },
  orderedList: { icon: ListOrdered, label: "Numbered list", group: "list" },
  link: { icon: LinkIcon, label: "Link", group: "link" },
  quote: { icon: Quote, label: "Quote", group: "block" },
  clear: { icon: RemoveFormatting, label: "Clear formatting", group: "clear" },
};

type ToolbarItem = {
  feature: RichTextFeature;
  icon: LucideIcon;
  label: string;
  group: string;
  active: boolean;
  disabled: boolean;
  /** Command to run on activation; `undefined` for `link`, which is rendered as its own popover/submenu surface. */
  run?: () => void;
};

/**
 * Resolves the live state of one feature (active + disabled + command) so the inline button, the overflow menu item,
 * and the measurement mirror all derive from a single source — the one place the toolbar reads {@link ToolbarState}.
 */
function buildItem(
  feature: RichTextFeature,
  state: ToolbarState,
  editor: ReturnType<typeof useRichTextEditor>,
  disabled: boolean
): ToolbarItem {
  const meta = FEATURE_META[feature];
  // Inline marks stay available even with a collapsed selection; block toggles need an editable range.
  const off = disabled || !state.canEdit;
  const base = { feature, icon: meta.icon, label: meta.label, group: meta.group };
  switch (feature) {
    case "bold":
      return { ...base, active: state.bold, disabled, run: () => richTextCommands.toggleInline(editor, "bold") };
    case "italic":
      return { ...base, active: state.italic, disabled, run: () => richTextCommands.toggleInline(editor, "italic") };
    case "underline":
      return {
        ...base,
        active: state.underline,
        disabled,
        run: () => richTextCommands.toggleInline(editor, "underline"),
      };
    case "h2":
      return {
        ...base,
        active: state.blockType === "h2",
        disabled: off,
        run: () => richTextCommands.toggleHeading(editor, "h2", state.blockType === "h2"),
      };
    case "h3":
      return {
        ...base,
        active: state.blockType === "h3",
        disabled: off,
        run: () => richTextCommands.toggleHeading(editor, "h3", state.blockType === "h3"),
      };
    case "bulletList":
      return {
        ...base,
        active: state.blockType === "bullet",
        disabled: off,
        run: () => richTextCommands.toggleBulletList(editor, state.blockType === "bullet"),
      };
    case "orderedList":
      return {
        ...base,
        active: state.blockType === "number",
        disabled: off,
        run: () => richTextCommands.toggleOrderedList(editor, state.blockType === "number"),
      };
    case "quote":
      return {
        ...base,
        active: state.blockType === "quote",
        disabled: off,
        run: () => richTextCommands.toggleQuote(editor, state.blockType === "quote"),
      };
    case "clear":
      return { ...base, active: false, disabled: off, run: () => richTextCommands.clearFormatting(editor) };
    case "link":
      return { ...base, active: state.isLink, disabled: off };
  }
}

/** Vertical rule drawn before an item whenever the feature cluster changes from the previous rendered item. */
function GroupSeparator(): React.JSX.Element {
  return <Separator orientation="vertical" className="mx-0.5 h-5" />;
}

type RichTextToolbarProps = {
  features: readonly RichTextFeature[];
  disabled?: boolean;
};

/**
 * Toolbar built from shared/ui primitives only: standalone toggle buttons styled with {@link toggleVariants},
 * `Separator` between clusters, `Tooltip` on each, lucide icons. Pressed state comes from {@link useToolbarState} —
 * the single source of truth.
 *
 * To avoid wrapping onto a second line on narrow surfaces, the toolbar measures itself (see
 * {@link useToolbarOverflow}) and keeps only the leading items that fit on one row; the remainder collapse into a
 * "More" dropdown that mirrors each control as a menu item. Must render inside a `LexicalComposer`.
 */
export function RichTextToolbar({ features, disabled = false }: RichTextToolbarProps): React.JSX.Element {
  const editor = useRichTextEditor();
  const state = useToolbarState();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = features.map((feature) => buildItem(feature, state, editor, disabled));
  const { containerRef, mirrorRef, triggerRef, visibleCount } = useToolbarOverflow(items.length);

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);

  const renderControl = (item: ToolbarItem) => {
    if (item.feature === "link") {
      return <RichTextLinkButton active={item.active} currentUrl={state.linkUrl} disabled={item.disabled} />;
    }
    return (
      <RichTextToolbarButton
        icon={item.icon}
        label={item.label}
        active={item.active}
        disabled={item.disabled}
        onClick={() => item.run?.()}
      />
    );
  };

  const renderOverflowItem = (item: ToolbarItem) => {
    if (item.feature === "link") {
      return (
        <RichTextLinkMenuItem
          key={item.feature}
          active={item.active}
          currentUrl={state.linkUrl}
          disabled={item.disabled}
          onApplied={() => setMenuOpen(false)}
        />
      );
    }
    const Icon = item.icon;
    // Clear is a one-shot action; everything else is a toggle, so it reflects its pressed state with a checkmark.
    if (item.feature === "clear") {
      return (
        <DropdownMenuItem
          key={item.feature}
          disabled={item.disabled}
          // Keep the menu open so several formats can be applied in one visit.
          onSelect={(e) => {
            e.preventDefault();
            item.run?.();
          }}
        >
          <Icon aria-hidden />
          {item.label}
        </DropdownMenuItem>
      );
    }
    return (
      <DropdownMenuCheckboxItem
        key={item.feature}
        checked={item.active}
        disabled={item.disabled}
        className="pr-8 pl-1.5"
        onSelect={(e) => {
          e.preventDefault();
          item.run?.();
        }}
      >
        <Icon aria-hidden />
        {item.label}
      </DropdownMenuCheckboxItem>
    );
  };

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        data-slot="rich-text-toolbar"
        className="relative flex items-center gap-0.5 overflow-hidden border-b border-input p-1"
      >
        {visible.map((item, index) => (
          <div key={item.feature} className="flex items-center">
            {index > 0 && item.group !== visible[index - 1].group ? <GroupSeparator /> : null}
            {renderControl(item)}
          </div>
        ))}

        {overflow.length > 0 ? (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger
                  type="button"
                  // Same caret-preservation reason as the toolbar buttons: keep the editor's selection intact.
                  onMouseDown={(e) => e.preventDefault()}
                  data-state={menuOpen ? "on" : "off"}
                  aria-label="More formatting"
                  className={cn(toggleVariants({ variant: "segmented", size: "xs" }), "ml-auto")}
                >
                  <MoreHorizontal aria-hidden />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-auto min-w-44" onCloseAutoFocus={(e) => e.preventDefault()}>
              {overflow.map((item, index) => (
                <span key={item.feature} className="contents">
                  {index > 0 && item.group !== overflow[index - 1].group ? <DropdownMenuSeparator /> : null}
                  {renderOverflowItem(item)}
                </span>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {/* Hidden mirrors: a full-size copy of every item plus the trigger, measured by useToolbarOverflow. They are
            inert (aria-hidden, no focusable controls) so they never reach the accessibility tree or steal the caret. */}
        <div
          ref={mirrorRef}
          aria-hidden
          className="pointer-events-none invisible absolute top-0 left-0 flex flex-nowrap items-center gap-0.5"
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.feature} className="flex shrink-0 items-center">
                {index > 0 && item.group !== items[index - 1].group ? <GroupSeparator /> : null}
                <span className={cn(toggleVariants({ variant: "segmented", size: "xs" }))}>
                  <Icon aria-hidden />
                </span>
              </div>
            );
          })}
        </div>
        <div ref={triggerRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0">
          <span className={cn(toggleVariants({ variant: "segmented", size: "xs" }))}>
            <MoreHorizontal aria-hidden />
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
