import { describe, expect, it } from "vitest";
import {
  isSupportRequestEmailValid,
  isTowerSupportRequestKind,
  isTowerSupportRequestTopic,
  TOWER_SUPPORT_REQUEST_CONFIG,
  validateSupportRequestForm,
} from "./tower-support-request.js";

describe("tower-support-request", () => {
  it("accepts canonical kinds", () => {
    expect(isTowerSupportRequestKind("feedback")).toBe(true);
    expect(isTowerSupportRequestKind("help")).toBe(true);
    expect(isTowerSupportRequestKind("other")).toBe(false);
  });

  it("validates topics by kind", () => {
    expect(isTowerSupportRequestTopic("help", "beacon")).toBe(true);
    expect(isTowerSupportRequestTopic("help", "not-a-topic")).toBe(false);
  });

  it("requires topic and details", () => {
    const config = TOWER_SUPPORT_REQUEST_CONFIG.feedback;
    expect(validateSupportRequestForm(config, { topic: "", details: "x" })).toMatch(/category/i);
    expect(validateSupportRequestForm(config, { topic: "general", details: "" })).toMatch(/feedback/i);
    expect(validateSupportRequestForm(config, { topic: "general", details: "ok" })).toBeNull();
  });

  it("requires email when configured for guest submit", () => {
    const config = TOWER_SUPPORT_REQUEST_CONFIG.help;
    expect(
      validateSupportRequestForm(config, { topic: "beacon", details: "stuck", email: "bad" }, { requireEmail: true })
    ).toMatch(/email/i);
    expect(isSupportRequestEmailValid("you@example.com")).toBe(true);
    expect(
      validateSupportRequestForm(
        config,
        { topic: "beacon", details: "stuck", email: "you@example.com" },
        { requireEmail: true }
      )
    ).toBeNull();
  });
});
