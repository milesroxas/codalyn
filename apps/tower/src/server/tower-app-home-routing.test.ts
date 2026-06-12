import { describe, expect, it } from "vitest";
import { shouldRedirectLoggedOutAppHostHomeToMarketing } from "./tower-app-home-routing";

describe("shouldRedirectLoggedOutAppHostHomeToMarketing", () => {
  it("redirects logged-out visitors on the split app host without a session cookie", () => {
    expect(
      shouldRedirectLoggedOutAppHostHomeToMarketing({
        signedIn: false,
        hostSplitEnabled: true,
        isAppHost: true,
        hasSessionCookie: false,
      })
    ).toBe(true);
  });

  it("keeps visitors on the app host when a session cookie is present after sign-in", () => {
    expect(
      shouldRedirectLoggedOutAppHostHomeToMarketing({
        signedIn: false,
        hostSplitEnabled: true,
        isAppHost: true,
        hasSessionCookie: true,
      })
    ).toBe(false);
  });

  it("does not redirect signed-in users", () => {
    expect(
      shouldRedirectLoggedOutAppHostHomeToMarketing({
        signedIn: true,
        hostSplitEnabled: true,
        isAppHost: true,
        hasSessionCookie: false,
      })
    ).toBe(false);
  });
});
