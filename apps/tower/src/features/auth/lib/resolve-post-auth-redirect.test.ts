import { describe, expect, it } from "vitest";
import { resolvePostAuthRedirectTarget } from "./resolve-post-auth-redirect";

describe("resolvePostAuthRedirectTarget", () => {
  it("keeps explicit callback paths", () => {
    expect(resolvePostAuthRedirectTarget({ role: "user" }, "/team")).toBe("/team");
  });

  it("sends product admins home to the operator console", () => {
    expect(resolvePostAuthRedirectTarget({ role: "product_admin" }, "/")).toBe("/console");
  });

  it("rejects unsafe callback targets", () => {
    expect(resolvePostAuthRedirectTarget({ role: "user" }, "//evil.test/phish")).toBe("/");
  });
});
