import { TOWER_STATIC_BEACON_RELATED_ORIGINS } from "@/server/tower-static-beacon-origins";
import { isWebflowDesignerExtensionOrigin } from "@/server/tower-webflow-designer-origins";

/**
 * Trusted target origins for the Beacon popup session handoff (`window.opener.postMessage`).
 *
 * The `beaconOrigin` used as the `postMessage` target origin comes from an attacker-controllable
 * query param, and the message carries the Better Auth bearer token + user PII. It MUST be validated
 * against this allowlist before anything is posted, otherwise `?beaconOrigin=https://evil.com` leaks a
 * live session to the attacker (account takeover).
 *
 * Mirrors the credentialed-CORS allowlist (`towerCorsHeadersFor`): the static Beacon/dev origins plus
 * the Webflow Designer extension origins. Pure (no secrets), so it is safe to import into client code.
 */
export function isTrustedBeaconMessageOrigin(origin: string | null | undefined): boolean {
  if (!origin) {
    return false;
  }
  if ((TOWER_STATIC_BEACON_RELATED_ORIGINS as readonly string[]).includes(origin)) {
    return true;
  }
  return isWebflowDesignerExtensionOrigin(origin);
}
