import { describe, expect, it } from "vitest";
import {
  CODALYN_POSTHOG_KEY,
  CODALYN_SENTRY_DSN,
  resolvePostHogHost,
  resolvePostHogKey,
  resolveSentryDsn,
} from "./index";

describe("resolvePostHogKey", () => {
  it("returns shared key by default", () => {
    expect(resolvePostHogKey()).toBe(CODALYN_POSTHOG_KEY);
  });

  it("allows override", () => {
    expect(resolvePostHogKey("phc_custom")).toBe("phc_custom");
  });

  it("disables when set to off", () => {
    expect(resolvePostHogKey("off")).toBeUndefined();
    expect(resolvePostHogKey("0")).toBeUndefined();
    expect(resolvePostHogKey("false")).toBeUndefined();
  });

  it("uses default when empty string", () => {
    expect(resolvePostHogKey("")).toBe(CODALYN_POSTHOG_KEY);
  });
});

describe("resolveSentryDsn", () => {
  it("returns shared dsn by default", () => {
    expect(resolveSentryDsn()).toBe(CODALYN_SENTRY_DSN);
  });

  it("allows override", () => {
    expect(resolveSentryDsn("https://example@sentry.io/1")).toBe("https://example@sentry.io/1");
  });

  it("disables when set to off", () => {
    expect(resolveSentryDsn("off")).toBeUndefined();
    expect(resolveSentryDsn("0")).toBeUndefined();
    expect(resolveSentryDsn("false")).toBeUndefined();
  });

  it("uses default when empty string", () => {
    expect(resolveSentryDsn("")).toBe(CODALYN_SENTRY_DSN);
  });
});

describe("resolvePostHogHost", () => {
  it("defaults to us host", () => {
    expect(resolvePostHogHost()).toBe("https://us.i.posthog.com");
  });
});
