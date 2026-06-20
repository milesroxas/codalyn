import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { filterLinkOptions, LINK_PICKER_SEARCH_THRESHOLD } from "@/features/cms-slots/model/cms-slot-link-targets";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { InputSearch } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";

export type LinkResourceOption = { id: string; name: string; path: string };

type LinkResourcePickerProps = {
  options: readonly LinkResourceOption[];
  selectedId: string | null;
  onSelect: (option: LinkResourceOption) => void;
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  /** Option that cannot be picked (e.g. the page the designer is already on). Rendered dimmed and non-interactive. */
  disabledOptionId?: string | null;
  /** Muted suffix shown on the disabled option to explain why it can't be picked. */
  disabledOptionHint?: string;
  /** Trigger text shown when nothing is selected. */
  placeholder: string;
  searchPlaceholder: string;
  /** Shown when the source has no options at all. */
  emptyText: string;
  /** Accessible name for the trigger. */
  ariaLabel: string;
};

/**
 * Single-source searchable selector used for every link target list (pages, collections, entries). A Popover anchors
 * a ScrollArea list of options; the search input appears only once the list exceeds
 * {@link LINK_PICKER_SEARCH_THRESHOLD} items. Row presentation is owned here so call sites never restyle primitives.
 */
export function LinkResourcePicker({
  options,
  selectedId,
  onSelect,
  loading,
  error,
  disabled = false,
  disabledOptionId = null,
  disabledOptionHint,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
}: LinkResourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => options.find((o) => o.id === selectedId) ?? null, [options, selectedId]);
  const showSearch = options.length > LINK_PICKER_SEARCH_THRESHOLD;
  const filtered = useMemo(() => filterLinkOptions(options, query), [options, query]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="xs"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled || loading}
          className="w-full justify-between font-normal"
        >
          <span className={cn("min-w-0 truncate text-left", selected == null && "text-muted-foreground")}>
            {loading ? "Loading…" : (selected?.name ?? placeholder)}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        {showSearch ? (
          <div className="p-1">
            <InputSearch
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}
        {error != null ? (
          <p className="px-2 py-5 text-center text-xs text-destructive">{error}</p>
        ) : options.length === 0 ? (
          <p className="px-2 py-5 text-center text-xs text-muted-foreground">{emptyText}</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-5 text-center text-xs text-muted-foreground">No matches.</p>
        ) : (
          <ScrollArea className="max-h-64">
            <ul className="flex flex-col gap-0.5 p-1">
              {filtered.map((option) => {
                const isSelected = option.id === selectedId;
                const isDisabled = option.id === disabledOptionId;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled}
                      disabled={isDisabled}
                      onClick={() => {
                        onSelect(option);
                        handleOpenChange(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs font-normal outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Check
                        className={cn("size-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">{option.name}</span>
                      {isDisabled && disabledOptionHint != null ? (
                        <span className="ml-auto shrink-0 text-muted-foreground">{disabledOptionHint}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
