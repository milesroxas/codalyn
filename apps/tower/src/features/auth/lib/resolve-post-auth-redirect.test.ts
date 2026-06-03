import { describe, expect, it } from "vitest";
import { resolvePostAuthRedirectTarget } from "./resolve-post-auth-redirect";

describe("resolvePostAuthRedirectTarget", () => {
  it("keeps explicit callback paths", () => {
    expect(resolvePostAuthRedirectTarget({ role: "user" }, "/team")).toBe("/team");
  });

  it("sends product admins to the operator console from default landing paths", () => {
    expect(resolvePostAuthRedirectTarget({ role: "product_admin" }, "/")).toBe("/console");
    expect(resolvePostAuthRedirectTarget({ role: "product_admin" }, "/sign-in")).toBe("/console");
  });

  it("keeps explicit callback paths for product admins", () => {
    expect(resolvePostAuthRedirectTarget({ role: "product_admin" }, "/account")).toBe("/account");
    expect(resolvePostAuthRedirectTarget({ role: "product_admin" }, "/console/customers")).toBe("/console/customers");
  });

  it("rejects unsafe callback targets", () => {
    expect(resolvePostAuthRedirectTarget({ role: "user" }, "//evil.test/phish")).toBe("/");
  });
});
