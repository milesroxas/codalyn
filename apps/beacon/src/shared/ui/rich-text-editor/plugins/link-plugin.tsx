import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
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

type RichTextLinkButtonProps = {
  active: boolean;
  currentUrl: string;
  disabled?: boolean;
};

/**
 * Toolbar link control: a popover with a URL field. Insert/edit applies the link to the current selection (validated
 * against {@link isSafeRichTextUrl}); Remove strips it. `javascript:`/`data:` and other non-allowlisted schemes are
 * rejected before dispatch. The trigger reflects the active-link state as its pressed look.
 */
export function RichTextLinkButton({ active, currentUrl, disabled }: RichTextLinkButtonProps): React.JSX.Element {
  const editor = useRichTextEditor();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUrl(currentUrl);
      setInvalid(false);
    }
    setOpen(next);
  };

  const apply = () => {
    const trimmed = url.trim();
    if (trimmed.length === 0 || !isSafeRichTextUrl(trimmed)) {
      setInvalid(true);
      return;
    }
    richTextCommands.setLink(editor, trimmed);
    setOpen(false);
  };

  const remove = () => {
    richTextCommands.setLink(editor, null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
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
      </PopoverContent>
    </Popover>
  );
}
