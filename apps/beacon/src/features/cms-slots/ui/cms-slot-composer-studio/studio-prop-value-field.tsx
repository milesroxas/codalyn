import type { ReactElement } from "react";
import {
  type CmsSlotStudioPropFieldKind,
  type ComposableInstancePropMeta,
  cmsSlotStudioFieldKindForValueType,
  isCmsSlotImageValueType,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  colorInputValue,
  dateInputValue,
  parseBoolString,
} from "@/features/cms-slots/model/cms-slot-composer-prop-input-normalize";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

type StudioPropValueFieldProps = {
  inputId: string;
  ep: ComposableInstancePropMeta;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
};

function StudioPropSelectField(
  p: StudioPropValueFieldProps & { options: NonNullable<ComposableInstancePropMeta["selectOptions"]> }
) {
  const { inputId, ep, value, busy, onChange, options } = p;
  const hasValue = value.trim() !== "";
  const valueInList = options.some((o) => o.value === value);
  return (
    <select
      id={inputId}
      className={cn(
        "h-8 w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        "md:text-sm"
      )}
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ep.label}
    >
      {!hasValue ? <option value="">—</option> : null}
      {hasValue && !valueInList ? (
        <option value={value}>
          {value}
          {" · not in list"}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const STUDIO_PROP_VALUE_BY_KIND: Record<CmsSlotStudioPropFieldKind, (p: StudioPropValueFieldProps) => ReactElement> = {
  boolean: ({ inputId, value, busy, onChange }) => (
    <div className="flex items-center gap-2 py-0.5">
      <Checkbox
        id={inputId}
        checked={parseBoolString(value)}
        disabled={busy}
        onCheckedChange={(c) => {
          if (c === "indeterminate") return;
          onChange(c === true ? "true" : "false");
        }}
      />
      <span className="text-xs text-muted-foreground">{parseBoolString(value) ? "Yes" : "No"}</span>
    </div>
  ),
  number: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="number"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  url: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="url"
      inputMode="url"
      autoComplete="url"
      placeholder="https://…"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  email: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="email"
      inputMode="email"
      autoComplete="email"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  tel: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  image: ({ inputId, ep, value, busy, onChange }) => {
    const fileLike = ep.valueType === "file";
    const imageHint = isCmsSlotImageValueType(ep.valueType);
    return (
      <div className="space-y-1">
        <Input
          id={inputId}
          className="text-sm"
          type="text"
          inputMode="url"
          placeholder={fileLike ? "File URL" : imageHint ? "https://… (image link from Webflow Assets)" : "Image URL"}
          value={value}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
        />
        {imageHint ? (
          <p className="text-[0.65rem] leading-snug text-muted-foreground">
            Paste the image link URL from Webflow Assets — not the asset id.
          </p>
        ) : null}
      </div>
    );
  },
  date: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="date"
      value={dateInputValue(value)}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  color: ({ inputId, ep, value, busy, onChange }) => (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id={inputId}
        className="size-8 cursor-pointer border border-input bg-background disabled:cursor-not-allowed"
        type="color"
        value={colorInputValue(value)}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ep.label}
      />
      <Input
        className="min-w-32 flex-1 text-sm"
        type="text"
        placeholder="#RRGGBB"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
  multiline: ({ inputId, value, busy, onChange }) => (
    <Textarea
      id={inputId}
      className="min-h-16 max-h-40 resize-y text-sm"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  line: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="text"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
};

export function StudioPropValueField(props: StudioPropValueFieldProps) {
  const { inputId, ep, value, busy, onChange } = props;
  const kind = cmsSlotStudioFieldKindForValueType(ep.valueType);
  const options = ep.selectOptions;

  if (options != null && options.length > 0) {
    return (
      <StudioPropSelectField
        inputId={inputId}
        ep={ep}
        value={value}
        busy={busy}
        onChange={onChange}
        options={options}
      />
    );
  }

  return STUDIO_PROP_VALUE_BY_KIND[kind](props);
}
