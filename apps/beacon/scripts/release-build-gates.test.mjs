/**
 * Guards the release-bundle gates that keep Webflow Marketplace findings from shipping. These
 * live in the repo-root build scripts, but they are exercised from Beacon's suite because Beacon
 * is the app they gate and `pnpm test:run` runs inside the release pipeline (build-cli.mjs runs
 * lint + tests before the Vite build), so a broken gate fails the build it protects.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertRequiredReleaseEnv,
  collectForbiddenBundleMarkers,
  matchForbiddenMarker,
  resolveViteEnvValue,
} from "../../../scripts/build-cli.mjs";
import { createStripDevHostLiteralsPlugin } from "../../../scripts/vite-strip-dev-host-literals.mjs";

const require = createRequire(import.meta.url);
const POSTHOG_MODULE_ID = require.resolve("posthog-js/dist/module.js");
const POSTHOG_MODULE_SOURCE = readFileSync(POSTHOG_MODULE_ID, "utf-8");

function transform(code, id, options) {
  return createStripDevHostLiteralsPlugin(options).transform(code, id);
}

function tempAppDir() {
  return mkdtempSync(join(tmpdir(), "codalyn-release-gate-"));
}

describe("strip-dev-host-literals / posthog-js", () => {
  it("leaves no dev-host or Sentry literal in the vendor module it rewrites", () => {
    const result = transform(POSTHOG_MODULE_SOURCE, POSTHOG_MODULE_ID, { strict: true });

    expect(result).not.toBeNull();
    expect(result.code).not.toMatch(/localhost|127\.0\.0\.1/i);
    expect(result.code).not.toMatch(/sentry/i);
  });

  it("removes the Sentry integration instance properties rather than only its literals", () => {
    const { code } = transform(POSTHOG_MODULE_SOURCE, POSTHOG_MODULE_ID, { strict: true });

    expect(POSTHOG_MODULE_SOURCE).toContain("this.SentryIntegration=");
    expect(code).not.toContain("SentryIntegration");
    expect(code).not.toContain("sentryIntegration");
  });

  it("fails the release build when a vendor upgrade moves a dev-host literal", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe="http://localhost:3000";\n`;

    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: true })).toThrow(/dev-host literal/);
  });

  it("fails the release build when a vendor upgrade moves a Sentry reference", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe="https://sentry.io/x";\n`;

    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: true })).toThrow(/Sentry reference/);
  });

  it("only warns-by-omission in non-strict (development channel) builds", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe="http://localhost:3000";\n`;

    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: false })).not.toThrow();
  });

  it("ignores modules it has not audited", () => {
    expect(transform('const a="http://localhost:3000";', "/src/app/thing.ts", { strict: true })).toBeNull();
  });
});

describe("matchForbiddenMarker", () => {
  const forbidden = collectForbiddenBundleMarkers(tempAppDir(), "production");

  it("catches dev hosts regardless of casing", () => {
    expect(matchForbiddenMarker('fetch("http://LocalHost:3000")', forbidden)?.value).toBe("localhost");
    expect(matchForbiddenMarker("const a=__forceAllowLocalhost;", forbidden)?.value).toBe("localhost");
    expect(matchForbiddenMarker("const a=127.0.0.1;", forbidden)?.value).toBe("127.0.0.1");
  });

  it("catches Sentry references regardless of casing", () => {
    expect(matchForbiddenMarker("x.SentryIntegration=1", forbidden)?.value).toBe("sentry");
    expect(matchForbiddenMarker("$sentry_url", forbidden)?.value).toBe("sentry");
  });

  it("passes clean bundle text", () => {
    expect(matchForbiddenMarker('fetch("https://tower.codalyn.app/api")', forbidden)).toBeNull();
  });

  it("is inert on development builds, which may legitimately point at a local Tower", () => {
    expect(collectForbiddenBundleMarkers(tempAppDir(), "development")).toEqual([]);
  });
});

describe("resolveViteEnvValue", () => {
  it("reads a plain KEY=value from .env", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), "VITE_FLAG=true\n");

    expect(resolveViteEnvValue({ appPath, mode: "production", key: "VITE_FLAG", inlineEnv: {} })).toBe("true");
  });

  it("accepts quoted, exported, and inline-commented forms", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), 'export VITE_FLAG="true" \n');

    expect(resolveViteEnvValue({ appPath, mode: "production", key: "VITE_FLAG", inlineEnv: {} })).toBe("true");

    writeFileSync(join(appPath, ".env"), "VITE_FLAG=true # enabled\n");
    expect(resolveViteEnvValue({ appPath, mode: "production", key: "VITE_FLAG", inlineEnv: {} })).toBe("true");
  });

  it("applies Vite's file precedence, later files winning", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), "VITE_FLAG=false\n");
    writeFileSync(join(appPath, ".env.production"), "VITE_FLAG=true\n");

    expect(resolveViteEnvValue({ appPath, mode: "production", key: "VITE_FLAG", inlineEnv: {} })).toBe("true");
  });

  it("lets an inline VITE_ value win over every file, as vite loadEnv does", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), "VITE_FLAG=true\n");

    expect(resolveViteEnvValue({ appPath, mode: "production", key: "VITE_FLAG", inlineEnv: { VITE_FLAG: "" } })).toBe(
      ""
    );
  });

  it("returns null for missing files, commented-out keys, and absent keys", () => {
    const appPath = tempAppDir();
    expect(resolveViteEnvValue({ appPath, mode: "production", key: "VITE_FLAG", inlineEnv: {} })).toBeNull();

    writeFileSync(join(appPath, ".env"), "# VITE_FLAG=true\nVITE_OTHER=1\n");
    expect(resolveViteEnvValue({ appPath, mode: "production", key: "VITE_FLAG", inlineEnv: {} })).toBeNull();
  });
});

describe("assertRequiredReleaseEnv", () => {
  const cmsSlotsFlag = "VITE_CMS_SLOTS_SURFACE_ENABLED";

  // The flag is a kill switch that defaults on, so only an explicit "false" may fail a release build.
  // Unset must PASS: requiring an opt-in value is what silently shipped a disabled CMS Slots surface,
  // since every .env* file is gitignored and the value lived on one machine.
  it("fails a production build when the CMS Slots flag explicitly disables the surface", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), `${cmsSlotsFlag}=false\n`);

    expect(() =>
      assertRequiredReleaseEnv({ appName: "beacon", appPath, channel: "production", inlineEnv: {} })
    ).toThrow(new RegExp(cmsSlotsFlag));
  });

  it("fails a preview build on an explicit disable too", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), `${cmsSlotsFlag}=false\n`);

    expect(() => assertRequiredReleaseEnv({ appName: "beacon", appPath, channel: "preview", inlineEnv: {} })).toThrow(
      new RegExp(cmsSlotsFlag)
    );
  });

  it("passes when the flag is unset — the surface defaults on", () => {
    expect(() =>
      assertRequiredReleaseEnv({ appName: "beacon", appPath: tempAppDir(), channel: "production", inlineEnv: {} })
    ).not.toThrow();
  });

  it("passes when the flag resolves to true", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), `${cmsSlotsFlag}=true\n`);

    expect(() =>
      assertRequiredReleaseEnv({ appName: "beacon", appPath, channel: "production", inlineEnv: {} })
    ).not.toThrow();
  });

  it("passes on an unrelated value — only an explicit disable is rejected", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), `${cmsSlotsFlag}=1\n`);

    expect(() =>
      assertRequiredReleaseEnv({ appName: "beacon", appPath, channel: "production", inlineEnv: {} })
    ).not.toThrow();
  });

  it("rejects an inline disable that overrides a file value, as vite loadEnv would", () => {
    const appPath = tempAppDir();
    writeFileSync(join(appPath, ".env"), `${cmsSlotsFlag}=true\n`);

    expect(() =>
      assertRequiredReleaseEnv({
        appName: "beacon",
        appPath,
        channel: "production",
        inlineEnv: { [cmsSlotsFlag]: "false" },
      })
    ).toThrow(new RegExp(cmsSlotsFlag));
  });

  it("does not gate development builds", () => {
    expect(() =>
      assertRequiredReleaseEnv({ appName: "beacon", appPath: tempAppDir(), channel: "development", inlineEnv: {} })
    ).not.toThrow();
  });

  it("does not gate apps with no required release env", () => {
    expect(() =>
      assertRequiredReleaseEnv({ appName: "tower", appPath: tempAppDir(), channel: "production", inlineEnv: {} })
    ).not.toThrow();
  });
});

describe("apps/beacon/.env.example", () => {
  it("ships the CMS Slots flag uncommented so a fresh clone builds a complete app", () => {
    const example = readFileSync(new URL("../.env.example", import.meta.url), "utf-8");

    expect(example).toMatch(/^VITE_CMS_SLOTS_SURFACE_ENABLED=true$/m);
  });
});
