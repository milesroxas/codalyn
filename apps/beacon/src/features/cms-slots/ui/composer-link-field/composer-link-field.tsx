import { useEffect, useMemo, useState } from "react";
import { LINK_KIND_LABEL, type LinkPickerCollection } from "@/features/cms-slots/model/cms-slot-link-targets";
import {
  type BeaconLinkKind,
  type BeaconLinkValue,
  decodeBeaconLinkValue,
  encodeBeaconLinkValue,
} from "@/features/cms-slots/model/cms-slot-link-value";
import {
  useCurrentTemplateCollectionId,
  useLinkPickerCollections,
  useLinkPickerEntries,
  useLinkPickerPages,
} from "@/features/cms-slots/model/use-cms-slot-link-targets";
import {
  type LinkResourceOption,
  LinkResourcePicker,
} from "@/features/cms-slots/ui/composer-link-field/link-resource-picker";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

type ComposerLinkFieldProps = {
  inputId: string;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
};

const KIND_ORDER: readonly BeaconLinkKind[] = ["url", "page", "cms"];

/** External links default to a new tab; internal page / CMS links to the current tab. */
function freshLinkForKind(kind: BeaconLinkKind, collectionId: string | null): BeaconLinkValue {
  if (kind === "url") {
    return { kind: "url", href: "", newTab: true };
  }
  if (kind === "page") {
    return { kind: "page", href: "", newTab: false };
  }
  return { kind: "cms", href: "", newTab: false, collectionId: collectionId ?? undefined };
}

/**
 * Rich editor for `link` props. A segmented control switches between an external URL, a site page, and a CMS
 * collection entry; page and CMS targets resolve to site-relative paths. An "open in new tab" switch applies to every
 * kind. The editor's value is the encoded link string (see `cms-slot-link-value`), kept in local state so an
 * in-progress CMS selection (collection chosen, entry pending) survives re-renders before it is persistable.
 */
export function ComposerLinkField({ inputId, value, busy, onChange }: ComposerLinkFieldProps) {
  const [link, setLink] = useState<BeaconLinkValue>(() => decodeBeaconLinkValue(value));
  const [collectionId, setCollectionId] = useState<string | null>(
    () => decodeBeaconLinkValue(value).collectionId ?? null
  );

  const isCms = link.kind === "cms";
  const pages = useLinkPickerPages(link.kind === "page");
  const collections = useLinkPickerCollections(isCms);
  const currentCollectionId = useCurrentTemplateCollectionId(isCms);

  // Lowest-friction default: when the CMS tab opens with nothing chosen, preselect the current page's collection.
  useEffect(() => {
    if (isCms && collectionId == null && currentCollectionId != null) {
      setCollectionId(currentCollectionId);
    }
  }, [isCms, collectionId, currentCollectionId]);

  const selectedCollection = useMemo<LinkPickerCollection | null>(
    () => collections.items.find((c) => c.id === collectionId) ?? null,
    [collections.items, collectionId]
  );
  const entries = useLinkPickerEntries(isCms ? selectedCollection : null);

  const collectionOptions = useMemo<LinkResourceOption[]>(
    () => collections.items.map((c) => ({ id: c.id, name: c.name, path: c.templatePath })),
    [collections.items]
  );

  function emit(next: BeaconLinkValue) {
    setLink(next);
    onChange(encodeBeaconLinkValue(next));
  }

  function handleKind(next: BeaconLinkKind) {
    if (next === link.kind) {
      return;
    }
    emit(freshLinkForKind(next, collectionId));
  }

  return (
    <div className="space-y-2.5">
      <ToggleGroup
        type="single"
        variant="outline"
        size="xs"
        value={link.kind}
        onValueChange={(v) => {
          if (v) {
            handleKind(v as BeaconLinkKind);
          }
        }}
        aria-label="Link type"
      >
        {KIND_ORDER.map((kind) => (
          <ToggleGroupItem key={kind} value={kind} disabled={busy}>
            {LINK_KIND_LABEL[kind]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {link.kind === "url" ? (
        <Input
          id={inputId}
          className="text-sm"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://…"
          value={link.href}
          disabled={busy}
          onChange={(e) => emit({ kind: "url", href: e.target.value, newTab: link.newTab })}
        />
      ) : null}

      {link.kind === "page" ? (
        <LinkResourcePicker
          options={pages.items}
          selectedId={link.pageId ?? null}
          onSelect={(o) => emit({ kind: "page", href: o.path, newTab: link.newTab, pageId: o.id })}
          loading={pages.loading}
          error={pages.error}
          disabled={busy}
          placeholder="Select a page…"
          searchPlaceholder="Search pages…"
          emptyText="No pages found."
          ariaLabel="Select a page to link to"
        />
      ) : null}

      {isCms ? (
        <div className="space-y-1.5">
          <LinkResourcePicker
            options={collectionOptions}
            selectedId={collectionId}
            onSelect={(o) => {
              setCollectionId(o.id);
              emit({ kind: "cms", href: "", newTab: link.newTab, collectionId: o.id });
            }}
            loading={collections.loading}
            error={collections.error}
            disabled={busy}
            placeholder="Select a collection…"
            searchPlaceholder="Search collections…"
            emptyText="No collections with detail pages."
            ariaLabel="Select a CMS collection"
          />
          <LinkResourcePicker
            options={entries.items}
            selectedId={link.itemId ?? null}
            onSelect={(o) =>
              emit({
                kind: "cms",
                href: o.path,
                newTab: link.newTab,
                collectionId: collectionId ?? undefined,
                itemId: o.id,
              })
            }
            loading={entries.loading}
            error={entries.error}
            disabled={busy || selectedCollection == null}
            placeholder={selectedCollection == null ? "Select a collection first" : "Select an entry…"}
            searchPlaceholder="Search entries…"
            emptyText="No entries in this collection."
            ariaLabel="Select a CMS collection entry"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${inputId}-new-tab`} className="text-xs font-normal text-muted-foreground">
          Open in new tab
        </Label>
        <Switch
          id={`${inputId}-new-tab`}
          checked={link.newTab}
          disabled={busy}
          onCheckedChange={(checked) => emit({ ...link, newTab: checked })}
        />
      </div>
    </div>
  );
}
