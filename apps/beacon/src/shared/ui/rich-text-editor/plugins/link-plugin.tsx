import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { isSafeRichTextUrl } from "@/shared/ui/rich-text-editor/lib/rich-text-url";
import { richTextCommands, useRichTextEditor } from "@/shared/ui/rich-text-editor/plugins/toolbar-state-plugin";
import { toggleVariants } from "@/shared/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

/** LinkNode behaviour: applies/edits links and validates hrefs against the scheme allowlist. Register once. */
export function RichTextLinkPlugin(): React.JSX.Element {
  return <LinkPlugin validateUrl={isSafeRichTextUrl} />;
}

type LinkEditorFieldsProps = {
  active: boolean;
  /** Href of the link under the selection, used to seed the field. */
  currentUrl: string;
  /** Closes the host surface (popover or menu) after a successful apply/remove. */
  onDone: () => void;
  /** When rendered inside a Radix menu, keystrokes must not bubble to the menu's typeahead/navigation handlers. */
  inMenu?: boolean;
};

/**
 * The URL editor shared by both link surfaces: applies/edits links and validates hrefs against
 * {@link isSafeRichTextUrl}, or strips the link. Mounted only while its host (popover/submenu) is open, so the draft
 * seeds from `currentUrl` on mount. `javascript:`/`data:` and other non-allowlisted schemes are rejected before
 * dispatch. Keep this dumb — the selection it acts on lives in the Lexical editor state, not the DOM.
 */
function LinkEditorFields({ active, currentUrl, onDone, inMenu = false }: LinkEditorFieldsProps): React.JSX.Element {
  const editor = useRichTextEditor();
  const [url, setUrl] = useState(currentUrl);
  const [invalid, setInvalid] = useState(false);

  const apply = () => {
    const trimmed = url.trim();
    if (trimmed.length === 0 || !isSafeRichTextUrl(trimmed)) {
      setInvalid(true);
      return;
    }
    richTextCommands.setLink(editor, trimmed);
    onDone();
  };

  const remove = () => {
    richTextCommands.setLink(editor, null);
    onDone();
  };

  return (
    <>
      <Input
        type="url"
        inputMode="url"
        placeholder="https://…"
        value={url}
        aria-invalid={invalid}
        aria-label="Link URL"
        onChange={(e) => {
          setUrl(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          // Inside the overflow submenu, let arrow/typeahead keys edit the field instead of driving menu navigation.
          if (inMenu) {
            e.stopPropagation();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
      />
      {invalid ? <p className="text-[0.7rem] text-destructive">Enter a valid http(s), mailto, or tel link.</p> : null}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" size="sm" onClick={apply}>
          {active ? "Update" : "Add"}
        </Button>
        {active ? (
          <Button type="button" size="sm" variant="ghost" onClick={remove}>
            Remove
          </Button>
        ) : null}
      </div>
    </>
  );
}

type RichTextLinkButtonProps = {
  active: boolean;
  currentUrl: string;
  disabled?: boolean;
};

/**
 * Inline toolbar link control: a popover with the shared {@link LinkEditorFields}. The trigger reflects the
 * active-link state as its pressed look.
 */
export function RichTextLinkButton({ active, currentUrl, disabled }: RichTextLinkButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            type="button"
            disabled={disabled}
            data-state={active ? "on" : "off"}
            aria-label="Link"
            aria-pressed={active}
            className={cn(toggleVariants({ variant: "segmented", size: "xs" }))}
          >
            <LinkIcon aria-hidden />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Link</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-64 gap-2" onCloseAutoFocus={(e) => e.preventDefault()}>
        {open ? <LinkEditorFields active={active} currentUrl={currentUrl} onDone={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}

type RichTextLinkMenuItemProps = {
  active: boolean;
  currentUrl: string;
  disabled?: boolean;
  /** Closes the parent overflow menu once a link is applied or removed. */
  onApplied: () => void;
};

/**
 * Overflow-menu link control: the same {@link LinkEditorFields} hosted in a submenu so the URL editor survives the
 * collapse into the "More" menu without losing feature parity with the inline button.
 */
export function RichTextLinkMenuItem({
  active,
  currentUrl,
  disabled,
  onApplied,
}: RichTextLinkMenuItemProps): React.JSX.Element {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled} data-state={active ? "on" : "off"}>
        <LinkIcon aria-hidden />
        Link
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="grid w-64 gap-2 p-2">
        <LinkEditorFields active={active} currentUrl={currentUrl} onDone={onApplied} inMenu />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
