import { describe, expect, it } from "vitest";
import { isTrustedBeaconMessageOrigin } from "./tower-beacon-message-origin";

describe("isTrustedBeaconMessageOrigin", () => {
  it("accepts static Beacon/dev origins", () => {
    expect(isTrustedBeaconMessageOrigin("http://localhost:1337")).toBe(true);
    expect(isTrustedBeaconMessageOrigin("http://127.0.0.1:1337")).toBe(true);
    expect(isTrustedBeaconMessageOrigin("https://69e2b49536eded7411b48cf6.webflow-ext.com")).toBe(true);
  });

  it("accepts Webflow Designer extension origins", () => {
    expect(isTrustedBeaconMessageOrigin("https://anything.webflow-ext.com")).toBe(true);
    expect(isTrustedBeaconMessageOrigin("https://design.webflow.com")).toBe(true);
    expect(isTrustedBeaconMessageOrigin("https://sub.design.webflow.com")).toBe(true);
  });

  it("rejects missing / empty origins", () => {
    expect(isTrustedBeaconMessageOrigin(null)).toBe(false);
    expect(isTrustedBeaconMessageOrigin(undefined)).toBe(false);
    expect(isTrustedBeaconMessageOrigin("")).toBe(false);
  });

  it("rejects attacker-controlled origins", () => {
    expect(isTrustedBeaconMessageOrigin("https://evil.com")).toBe(false);
    // Suffix-smuggling: hostname does not END with the trusted suffix.
    expect(isTrustedBeaconMessageOrigin("https://evil.webflow-ext.com.attacker.com")).toBe(false);
    expect(isTrustedBeaconMessageOrigin("https://webflow-ext.com.evil.com")).toBe(false);
    // Scheme downgrade of an otherwise-static origin.
    expect(isTrustedBeaconMessageOrigin("http://69e2b49536eded7411b48cf6.webflow-ext.com")).toBe(false);
    expect(isTrustedBeaconMessageOrigin("not-a-url")).toBe(false);
  });
});
