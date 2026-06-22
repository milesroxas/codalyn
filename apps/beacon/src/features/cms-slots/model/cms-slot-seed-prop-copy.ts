/**
 * Boundary normalizer (CLAUDE.md): turns a source seed's `searchProps()` rows into `setProps` entries so a newly-added
 * variant seed inherits the **same prop values** the Designer set on the original. Webflow returns each prop's value as
 * a runtime union (`StaticPropValue | BindingValue`); this maps each shape to the matching `SetInstancePropEntry`
 * value, and drops shapes that cannot be re-applied (conditional/legacy bindings, cleared values).
 *
 * The `variant` prop is deliberately excluded — each seed pins its own variant (see [[cms-slot-instance-variant]]).
 */

/** Structural subset of one `InstanceProp` row needed to copy its value (avoids coupling to the full SDK type). */
export type SourcePropForCopy = {
  propId: string;
  valueType: string;
  hasOverride?: boolean;
  /** `SettingValue`: `{ sourceType: "static", value }` or a `BindingValue` (`prop` / `cms` / `page` / `locale` / …). */
  value?: unknown;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object";
}

function readString(x: unknown): string | null {
  return typeof x === "string" && x.length > 0 ? x : null;
}

/** Converts a `BindingValue` into the `BindingInput` accepted by `setProps`, or `null` when it cannot be re-applied. */
function bindingInputFromValue(value: Record<string, unknown>): BindingInput | null {
  switch (value.sourceType) {
    case "prop": {
      const propId = readString(value.propId);
      return propId != null ? { sourceType: "prop", propId } : null;
    }
    case "cms": {
      const collectionId = readString(value.collectionId);
      const fieldId = readString(value.fieldId);
      return collectionId != null && fieldId != null ? { sourceType: "cms", collectionId, fieldId } : null;
    }
    case "page": {
      const fieldKey = readString(value.fieldKey);
      return fieldKey != null ? { sourceType: "page", fieldKey } : null;
    }
    case "locale": {
      const fieldKey = readString(value.fieldKey);
      return fieldKey != null ? { sourceType: "locale", fieldKey } : null;
    }
    case "localeItem": {
      const fieldKey = readString(value.fieldKey);
      return fieldKey != null ? { sourceType: "localeItem", fieldKey } : null;
    }
    default:
      // conditional / legacy / unknown → not re-applicable.
      return null;
  }
}

/** The `setProps` value for one source prop, or `null` to skip it (default, cleared, or non-re-applicable binding). */
function copyValueFromSourceProp(value: unknown): SetInstancePropEntry["value"] | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.sourceType === "static") {
    const resolved = value.value;
    // Skip cleared/absent statics so the copy never blanks a prop that simply had no value.
    return resolved == null ? null : (resolved as ResolvedValue);
  }
  return bindingInputFromValue(value);
}

/**
 * Builds `setProps` entries that replicate the source seed's **explicit overrides** (`hasOverride`) onto another seed.
 * Props left at their component default, the `variant` prop, and non-re-applicable values are omitted.
 */
export function buildSeedPropCopyEntries(props: ReadonlyArray<SourcePropForCopy>): SetInstancePropEntry[] {
  const out: SetInstancePropEntry[] = [];
  for (const prop of props) {
    if (prop.valueType === "variant" || prop.hasOverride !== true) {
      continue;
    }
    const value = copyValueFromSourceProp(prop.value);
    if (value !== null) {
      out.push({ propId: prop.propId, value });
    }
  }
  return out;
}
