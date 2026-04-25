/**
 * Shared Webflow component **string** prop metadata for optional fields Beacon adds in the Designer.
 * Used by image export dimensions and list-target copy, etc. — one group label and one object shape.
 */
export const BEACON_COMPONENT_STRING_PROPS_GROUP = "Beacon" as const;

export type BeaconStringComponentPropOptions = {
  type: "string";
  name: string;
  group: string;
  defaultValue: string;
};

export function beaconStringComponentPropOptions(
  name: string,
  group: string = BEACON_COMPONENT_STRING_PROPS_GROUP
): BeaconStringComponentPropOptions {
  return { type: "string", name, group, defaultValue: "" };
}
