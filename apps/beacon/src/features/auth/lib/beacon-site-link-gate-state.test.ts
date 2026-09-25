import { describe, expect, it } from "vitest";
import { type BeaconSiteLinkGateInput, resolveBeaconSiteLinkGateState } from "./beacon-site-link-gate-state";

const SITE = "6a35c562c551e2eb11bc4f1c";

const base: BeaconSiteLinkGateInput = {
  signedIn: true,
  settingsPullPending: false,
  settingsPullSynced: true,
  siteReady: true,
  siteId: SITE,
  hasActiveWorkspace: true,
  workspaceCount: 1,
  authorizedSiteIds: [SITE],
};

describe("resolveBeaconSiteLinkGateState", () => {
  it("passes a signed-in user whose workspace grant covers the current site", () => {
    expect(resolveBeaconSiteLinkGateState(base)).toBe("pass");
  });

  it("passes logged-out users (the welcome gate owns them)", () => {
    expect(resolveBeaconSiteLinkGateState({ ...base, signedIn: false, hasActiveWorkspace: false })).toBe("pass");
  });

  it("blocks with loading while the settings pull or the site lookup is unresolved", () => {
    expect(resolveBeaconSiteLinkGateState({ ...base, settingsPullPending: true })).toBe("loading");
    expect(resolveBeaconSiteLinkGateState({ ...base, siteReady: false })).toBe("loading");
  });

  it("falls through when Tower could not be read or the site is unknown", () => {
    expect(resolveBeaconSiteLinkGateState({ ...base, settingsPullSynced: false, authorizedSiteIds: null })).toBe(
      "pass"
    );
    expect(resolveBeaconSiteLinkGateState({ ...base, siteId: null })).toBe("pass");
  });

  /**
   * The 2026-09-22 dead end: no active workspace means Tower lists no sites (`null`) and refuses to
   * mint an authorize URL. That must surface as the workspace step, never as "site not authorized".
   */
  it("asks for a workspace before judging the site when none is active", () => {
    expect(
      resolveBeaconSiteLinkGateState({
        ...base,
        hasActiveWorkspace: false,
        workspaceCount: 1,
        authorizedSiteIds: null,
      })
    ).toBe("choose_workspace");
    expect(
      resolveBeaconSiteLinkGateState({
        ...base,
        hasActiveWorkspace: false,
        workspaceCount: 3,
        authorizedSiteIds: [],
      })
    ).toBe("choose_workspace");
  });

  it("points to Tower when the user belongs to no workspace", () => {
    expect(
      resolveBeaconSiteLinkGateState({
        ...base,
        hasActiveWorkspace: false,
        workspaceCount: 0,
        authorizedSiteIds: null,
      })
    ).toBe("no_workspace");
  });

  it("offers the consent link only once a workspace is active and the site is outside its grant", () => {
    expect(resolveBeaconSiteLinkGateState({ ...base, authorizedSiteIds: ["other"] })).toBe("authorize");
    // Workspace active but never connected to Webflow: no token, no site list — still the consent link.
    expect(resolveBeaconSiteLinkGateState({ ...base, authorizedSiteIds: null })).toBe("authorize");
    expect(resolveBeaconSiteLinkGateState({ ...base, authorizedSiteIds: [] })).toBe("authorize");
  });

  it("matches the site by id, tolerating surrounding whitespace, never by label", () => {
    expect(resolveBeaconSiteLinkGateState({ ...base, authorizedSiteIds: [` ${SITE} `] })).toBe("pass");
    expect(resolveBeaconSiteLinkGateState({ ...base, authorizedSiteIds: ["Beacon Demo"] })).toBe("authorize");
  });
});
