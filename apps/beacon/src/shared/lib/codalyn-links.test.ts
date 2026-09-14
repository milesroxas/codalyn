import { describe, expect, it } from "vitest";
import {
  CODALYN_BEACON_DOCS_URL,
  CODALYN_EXTERNAL_LINK_REL,
  CODALYN_PRIVACY_POLICY_URL,
  CODALYN_TERMS_URL,
  codalynPolicyLinkProps,
} from "./codalyn-links";

describe("codalynPolicyLinkProps", () => {
  it.each([
    CODALYN_PRIVACY_POLICY_URL,
    CODALYN_TERMS_URL,
    CODALYN_BEACON_DOCS_URL,
  ] as const)("renders %s as a new-tab anchor with no opener and no referrer", (url) => {
    expect(codalynPolicyLinkProps(url)).toEqual({ href: url, target: "_blank", rel: "noopener noreferrer" });
  });

  it("pins the rel value every external anchor must carry", () => {
    expect(CODALYN_EXTERNAL_LINK_REL.split(" ").sort()).toEqual(["noopener", "noreferrer"]);
  });

  it("only points at production Tower policy/docs pages over https", () => {
    for (const url of [CODALYN_PRIVACY_POLICY_URL, CODALYN_TERMS_URL, CODALYN_BEACON_DOCS_URL]) {
      const parsed = new URL(url);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.hostname).toBe("tower.codalyn.app");
    }
  });
});
