/**
 * Serializable public-header navigation items. Produced server-side from the
 * Payload `header` global (see `features/marketing/cms/lib/resolve-header-nav`)
 * and passed as plain props into the client header components.
 */

export type TowerPublicNavLink = {
  label: string;
  href: string;
  newTab: boolean;
  /** Optional supporting line under the label (dropdown panels only). */
  description: string | null;
};

export type TowerPublicNavItem =
  | { type: "link"; label: string; href: string; newTab: boolean }
  | { type: "dropdown"; label: string; items: TowerPublicNavLink[] };
