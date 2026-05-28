import { describe, expect, it } from "vitest";
import { isTowerAuthSurfacePath, isTowerPublicLoggedOutSurface } from "@/shared/lib/navigation/tower-auth-surfaces";

describe("isTowerAuthSurfacePath", () => {
  it("matches auth surface routes", () => {
    expect(isTowerAuthSurfacePath("/sign-in")).toBe(true);
    expect(isTowerAuthSurfacePath("/sign-up")).toBe(true);
    expect(isTowerAuthSurfacePath("/forgot-password")).toBe(true);
    expect(isTowerAuthSurfacePath("/reset-password")).toBe(true);
    expect(isTowerAuthSurfacePath("/verify-email")).toBe(true);
    expect(isTowerAuthSurfacePath("/request-access")).toBe(true);
    expect(isTowerAuthSurfacePath("/invitations/accept")).toBe(true);
  });

  it("rejects non-auth routes", () => {
    expect(isTowerAuthSurfacePath("/team")).toBe(false);
    expect(isTowerAuthSurfacePath("/integrations/webflow/success")).toBe(false);
  });
});

describe("isTowerPublicLoggedOutSurface", () => {
  it("includes landing and auth surfaces", () => {
    expect(isTowerPublicLoggedOutSurface("/")).toBe(true);
    expect(isTowerPublicLoggedOutSurface("/invitations/accept")).toBe(true);
  });

  it("excludes authenticated app routes", () => {
    expect(isTowerPublicLoggedOutSurface("/team")).toBe(false);
  });
});
