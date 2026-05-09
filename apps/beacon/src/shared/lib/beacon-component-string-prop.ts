/**
 * Shared Webflow component **string** prop metadata for optional fields Beacon adds in the Designer.
 * Used by image export dimensions and list-target copy, etc. — one group label and one object shape.
 */
export const CMS_SLOT_COMPONENT_STRING_PROPS_GROUP = "Beacon" as const;

export type CmsSlotStringComponentPropOptions = {
  type: "string";
  name: string;
  group: string;
  defaultValue: string;
};

export function cmsSlotStringComponentPropOptions(
  name: string,
  group: string = CMS_SLOT_COMPONENT_STRING_PROPS_GROUP
): CmsSlotStringComponentPropOptions {
  return { type: "string", name, group, defaultValue: "" };
}
