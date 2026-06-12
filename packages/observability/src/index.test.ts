import { describe, expect, it } from "vitest";
import {
  buildCodalynPostHogSuperProperties,
  buildCodalynSentryEnvironment,
  buildCodalynSentryTags,
  CODALYN_POSTHOG_KEY,
  CODALYN_SENTRY_DSN,
  resolveCodalynBuildChannel,
  resolveCodalynSentryTracesSampleRate,
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

describe("resolveCodalynBuildChannel", () => {
  it("normalizes production aliases", () => {
    expect(resolveCodalynBuildChannel("production")).toBe("production");
    expect(resolveCodalynBuildChannel("prod")).toBe("production");
  });

  it("normalizes preview", () => {
    expect(resolveCodalynBuildChannel("preview")).toBe("preview");
  });

  it("normalizes development aliases", () => {
    expect(resolveCodalynBuildChannel("development")).toBe("development");
    expect(resolveCodalynBuildChannel("dev")).toBe("development");
  });

  it("defaults unknown values to development", () => {
    expect(resolveCodalynBuildChannel()).toBe("development");
    expect(resolveCodalynBuildChannel("staging")).toBe("development");
  });
});

describe("buildCodalynSentryEnvironment", () => {
  it("combines app and channel", () => {
    expect(buildCodalynSentryEnvironment("beacon", "production")).toBe("beacon-production");
    expect(buildCodalynSentryEnvironment("tower", "preview")).toBe("tower-preview");
  });
});

describe("buildCodalynSentryTags", () => {
  it("includes app and build_channel", () => {
    expect(buildCodalynSentryTags("flint", "development")).toEqual({
      app: "flint",
      build_channel: "development",
    });
  });
});

describe("resolveCodalynSentryTracesSampleRate", () => {
  it("samples less in production", () => {
    expect(resolveCodalynSentryTracesSampleRate("production")).toBe(0.1);
    expect(resolveCodalynSentryTracesSampleRate("preview")).toBe(1);
  });
});

describe("buildCodalynPostHogSuperProperties", () => {
  it("includes required fields and omits undefined optional fields", () => {
    expect(
      buildCodalynPostHogSuperProperties({
        app: "beacon",
        environment: "preview",
        app_version: "1.0.0",
      })
    ).toEqual({
      app: "beacon",
      environment: "preview",
      app_version: "1.0.0",
    });
  });
});
