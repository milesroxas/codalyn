/**
 * Guards the release-bundle gates that keep Webflow Marketplace findings from shipping. These
 * live in the repo-root build scripts, but they are exercised from Beacon's suite because Beacon
 * is the app they gate and `pnpm test:run` runs inside the release pipeline (build-cli.mjs runs
 * lint + tests before the Vite build), so a broken gate fails the build it protects.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertRequiredReleaseEnv,
  collectForbiddenBundleMarkers,
  extractSourceMapsToPrivateZip,
  findSourceMapEntries,
  listDistSourceMaps,
  matchForbiddenMarker,
  resolveViteEnvValue,
} from "../../../scripts/build-cli.mjs";
import {
  createStripDevHostLiteralsPlugin,
  rewriteSourceMapVendorContent,
} from "../../../scripts/vite-strip-dev-host-literals.mjs";

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

  it("compiles the project token out of every posthog-js request URL (App Review Preflight: Credential in URL)", () => {
    const { code } = transform(POSTHOG_MODULE_SOURCE, POSTHOG_MODULE_ID, { strict: true });

    // The installed module builds exactly these four token-in-query URLs; a vendor upgrade that
    // adds or moves one must be re-audited (the residual guard below fails the build).
    expect(POSTHOG_MODULE_SOURCE.match(/[?&]token=/g)).toHaveLength(4);
    expect(code).not.toMatch(/[?&]token=/i);
    // The bare endpoints survive; only the credential query is gone.
    expect(code).toContain('"/api/early_access_features/"');
    expect(code).toContain('"/api/product_tours/"');
    expect(code).toContain('"/api/surveys/"');
    expect(code).toContain('"/i/v1/logs"');
    // Event capture keeps sending the token in the request body — that assignment is untouched.
    expect(code).toContain("token=this.config.token");
  });

  it("fails the release build when a vendor upgrade adds a token-in-query URL", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe="/api/x/?token="+t;\n`;

    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: true })).toThrow(/credential-in-query-string URL/);
  });

  it("fails the release build when a vendor upgrade moves a Sentry reference", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe="https://sentry.io/x";\n`;

    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: true })).toThrow(/Sentry reference/);
  });

  // App Review Preflight (2026-08-19): "Fingerprinting & Session Replay" — evidence was posthog's
  // session-recording controller (`rrweb`, `initSessionRecording`, "could not load recorder"). The
  // pnpm patch excises it from the installed module; these tests prove the excision held for the
  // installed version and that the strip plugin's residual guard would catch it coming back.
  it("installs a posthog-js with the session-replay controller excised (pnpm patch applied)", () => {
    // The patch, not the transform, removes the recorder: the raw installed module is already clean —
    // controller, API, lazy-loader name, log text, and the recorder's config defaults / persistence keys.
    expect(POSTHOG_MODULE_SOURCE).not.toMatch(/rrweb|fullstory|recorder|replay|recording/i);
    expect(POSTHOG_MODULE_SOURCE).not.toContain("startSessionRecording(");
    expect(POSTHOG_MODULE_SOURCE).not.toContain("get_session_replay_url(");
    expect(POSTHOG_MODULE_SOURCE).not.toContain("this.sessionRecording");
    // The recorder-less core still carries everything Beacon uses: event capture, groups, exceptions.
    expect(POSTHOG_MODULE_SOURCE).toContain("__defaultExtensionClasses");
    expect(POSTHOG_MODULE_SOURCE).toContain("captureException(");
    expect(POSTHOG_MODULE_SOURCE).toContain("group(");
  });

  it("leaves no session-replay reference in the transformed vendor module", () => {
    const { code } = transform(POSTHOG_MODULE_SOURCE, POSTHOG_MODULE_ID, { strict: true });

    expect(code).not.toMatch(/rrweb|fullstory|recorder|replay|recording/i);
  });

  it("fails the release build when a vendor upgrade (or a regenerated patch) ships a recorder again", () => {
    for (const probe of [
      "window.rrweb",
      '"lazy-recorder"',
      "this.sessionRecording",
      '"[SessionRecording]"',
      "{disable_session_recording:!1}",
    ]) {
      const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe=${probe};\n`;
      expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: true })).toThrow(/session-replay reference/);
    }
  });

  it("only warns-by-omission in non-strict (development channel) builds", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe="http://localhost:3000";\n`;

    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: false })).not.toThrow();
  });

  it("ignores modules it has not audited", () => {
    expect(transform('const a="http://localhost:3000";', "/src/app/thing.ts", { strict: true })).toBeNull();
  });
});

describe("strip-dev-host-literals / react-dom + better-auth", () => {
  // `exports` maps hide the cjs files, so resolve them relative to each package's package.json.
  const reactDomDir = dirname(require.resolve("react-dom/package.json"));
  const REACT_DOM_CLIENT_ID = join(reactDomDir, "cjs/react-dom-client.production.js");
  const REACT_DOM_ID = join(reactDomDir, "cjs/react-dom.production.js");
  // better-auth's exports map hides dist internals; walk from its resolved React client entry instead.
  const BETTER_AUTH_URL_ID = join(
    dirname(fileURLToPath(import.meta.resolve("better-auth/react"))),
    "../../utils/url.mjs"
  );

  it("removes React's production error-decoder URL from both react-dom entry files", () => {
    for (const id of [REACT_DOM_CLIENT_ID, REACT_DOM_ID]) {
      const source = readFileSync(id, "utf-8");
      expect(source).toContain('"https://react.dev/errors/"');
      const result = transform(source, id, { strict: true });
      expect(result).not.toBeNull();
      expect(result.code).not.toMatch(/react\.dev/i);
      // The error code still reaches the message, so a thrown minified error stays decodable by hand.
      expect(result.code).toContain('"Minified React error #"');
    }
  });

  it("fails the release build if a React upgrade moves the decoder URL", () => {
    const moved = `${readFileSync(REACT_DOM_ID, "utf-8")}\nexport const probe="https://react.dev/errors/1";\n`;
    expect(() => transform(moved, REACT_DOM_ID, { strict: true })).toThrow(/react\.dev error-decoder URL/);
  });

  it("leaves no dev-host literal in better-auth's URL util (rule tracks the installed version)", () => {
    const result = transform(readFileSync(BETTER_AUTH_URL_ID, "utf-8"), BETTER_AUTH_URL_ID, { strict: true });
    expect(result).not.toBeNull();
    expect(result.code).not.toMatch(/localhost|127\.0\.0\.1/i);
  });
});

describe("matchForbiddenMarker", () => {
  const forbidden = collectForbiddenBundleMarkers(tempAppDir(), "production", "beacon");

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

  it("catches a token-in-query URL regardless of casing or position", () => {
    expect(matchForbiddenMarker('u="/api/surveys/?token="+k', forbidden)?.label).toMatch(/credential-in-query-string/);
    expect(matchForbiddenMarker('u="/x?v=2&TOKEN="+k', forbidden)?.label).toMatch(/credential-in-query-string/);
    // The request-body assignment posthog-js uses for event capture is not a URL — allowed.
    expect(matchForbiddenMarker("h.token=this.config.token", forbidden)).toBeNull();
  });

  it("catches session-replay references regardless of casing (rrweb, FullStory, posthog's recorder API)", () => {
    expect(matchForbiddenMarker("t=N.__PosthogExtensions__.rrweb", forbidden)?.value).toBe("rrweb");
    expect(matchForbiddenMarker("window.FullStory", forbidden)?.value).toBe("fullstory");
    expect(matchForbiddenMarker("this.sessionRecording=new u.sessionRecording(this)", forbidden)?.value).toBe(
      "sessionrecording"
    );
    expect(matchForbiddenMarker('"lazy-recorder"', forbidden)?.value).toBe("recorder");
    // The pinned privacy option is a config key, not a recorder reference — it stays shippable.
    expect(matchForbiddenMarker("disable_session_recording:!0", forbidden)).toBeNull();
    // The in-app privacy disclosure names what is NOT collected; prose stays shippable too.
    expect(
      matchForbiddenMarker("We never collect page content, session recordings, or location.", forbidden)
    ).toBeNull();
  });

  it("catches a sourceMappingURL comment — a map reference must never ship in the bundle", () => {
    expect(matchForbiddenMarker("//# sourceMappingURL=bundle.js.map", forbidden)?.value).toBe("sourceMappingURL");
  });

  it("is inert on development builds, which may legitimately point at a local Tower", () => {
    expect(collectForbiddenBundleMarkers(tempAppDir(), "development", "beacon")).toEqual([]);
  });

  it("does not forbid Sentry for Flint, which deliberately ships @sentry/react", () => {
    const forbiddenForFlint = collectForbiddenBundleMarkers(tempAppDir(), "production", "flint");
    expect(matchForbiddenMarker("x.SentryIntegration=1", forbiddenForFlint)).toBeNull();
    // Every other release marker still applies to Flint.
    expect(matchForbiddenMarker('fetch("http://localhost:3000")', forbiddenForFlint)?.value).toBe("localhost");
    expect(matchForbiddenMarker("https://tower.invalid/api", forbiddenForFlint)?.value).toBe("tower.invalid");
  });

  it("sweeps secrets from every env file Vite loads for the channel, including .env.<mode>.local", () => {
    const appPath = tempAppDir();
    const secret = "sk_live_0123456789abcdef";
    writeFileSync(join(appPath, ".env.production.local"), `VITE_BEACON_API_KEY=${secret}\n`);

    const markers = collectForbiddenBundleMarkers(appPath, "production", "beacon");
    expect(markers.some((m) => m.value === secret)).toBe(true);
  });

  it("deduplicates a secret that appears in more than one env file", () => {
    const appPath = tempAppDir();
    const secret = "sk_live_0123456789abcdef";
    writeFileSync(join(appPath, ".env"), `VITE_BEACON_API_KEY=${secret}\n`);
    writeFileSync(join(appPath, ".env.production"), `VITE_BEACON_API_KEY=${secret}\n`);

    const markers = collectForbiddenBundleMarkers(appPath, "production", "beacon");
    expect(markers.filter((m) => m.value === secret)).toHaveLength(1);
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

describe("source-map extraction (Marketplace submission form field)", () => {
  function fakeDist(appPath, files) {
    for (const [rel, contents] of Object.entries(files)) {
      const full = join(appPath, "dist", rel);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, contents);
    }
  }

  it("lists every .map under dist, recursively", () => {
    const appPath = tempAppDir();
    fakeDist(appPath, {
      "bundle.js": "console.log(1)",
      "bundle.js.map": "{}",
      "assets/chunk-abc.js.map": "{}",
      "styles.css": "body{}",
    });
    expect(listDistSourceMaps(appPath)).toEqual(["assets/chunk-abc.js.map", "bundle.js.map"]);
  });

  it("moves maps out of dist into the private zip so `webflow extension bundle` cannot ship them", () => {
    const appPath = tempAppDir();
    fakeDist(appPath, {
      "bundle.js": "console.log(1)",
      "bundle.js.map": '{"version":3}',
      "assets/chunk-abc.js.map": '{"version":3}',
    });
    const archive = join(appPath, "bundle", "production", "public", "v0.0.0_public_x.sourcemaps.zip");

    expect(extractSourceMapsToPrivateZip(appPath, archive)).toBe(archive);
    expect(existsSync(archive)).toBe(true);
    expect(listDistSourceMaps(appPath)).toEqual([]);
    expect(existsSync(join(appPath, "dist", "bundle.js"))).toBe(true);

    const entries = execSync(`unzip -Z1 ${JSON.stringify(archive)}`, { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean)
      .sort();
    expect(entries).toEqual(["assets/", "assets/chunk-abc.js.map", "bundle.js.map"]);
  });

  it("rewrites audited vendor sourcesContent so the private map artifact carries no token-in-query URL", () => {
    const appPath = tempAppDir();
    const map = {
      version: 3,
      sources: [POSTHOG_MODULE_ID, "../../src/shared/lib/init-observability.ts"],
      sourcesContent: [POSTHOG_MODULE_SOURCE, 'const own = "?token=" // first-party text is left alone'],
      mappings: "",
    };
    fakeDist(appPath, { "chunk.js": "console.log(1)", "chunk.js.map": JSON.stringify(map) });
    const archive = join(appPath, "bundle", "x.sourcemaps.zip");

    // First-party content with the same shape is not rewritten and trips the strict gate instead.
    expect(() => extractSourceMapsToPrivateZip(appPath, archive, { strict: true })).toThrow(
      /credential-in-query-string URL/
    );

    map.sourcesContent[1] = "const own = 1;";
    fakeDist(appPath, { "chunk.js.map": JSON.stringify(map) });
    expect(extractSourceMapsToPrivateZip(appPath, archive, { strict: true })).toBe(archive);
    const out = tempAppDir();
    execSync(`unzip -q ${JSON.stringify(archive)} -d ${JSON.stringify(out)}`);
    const written = JSON.parse(readFileSync(join(out, "chunk.js.map"), "utf-8"));
    expect(written.sourcesContent[0]).not.toMatch(/[?&]token=|localhost|sentry/i);
    expect(written.sourcesContent[0]).toContain('"/api/surveys/"');
    expect(written.sourcesContent[1]).toBe("const own = 1;");
    expect(written.mappings).toBe("");
  });

  it("rewriteSourceMapVendorContent passes non-watched sources and map-less shapes through unchanged", () => {
    const plain = { version: 3, sources: ["/src/a.ts"], sourcesContent: ["localhost"], mappings: "" };
    expect(rewriteSourceMapVendorContent(plain)).toEqual(plain);
    expect(rewriteSourceMapVendorContent({ version: 3, sources: [POSTHOG_MODULE_ID], mappings: "" })).toEqual({
      version: 3,
      sources: [POSTHOG_MODULE_ID],
      mappings: "",
    });
  });

  it("returns null and writes nothing when the build emitted no maps (Flint)", () => {
    const appPath = tempAppDir();
    fakeDist(appPath, { "bundle.js": "console.log(1)" });
    const archive = join(appPath, "bundle", "x.sourcemaps.zip");
    expect(extractSourceMapsToPrivateZip(appPath, archive)).toBeNull();
    expect(existsSync(archive)).toBe(false);
  });

  it("flags .map entries in an archived bundle listing", () => {
    expect(findSourceMapEntries(["webflow.json", "index.html", "bundle.js", "assets/x.js.MAP"])).toEqual([
      "assets/x.js.MAP",
    ]);
    expect(findSourceMapEntries(["webflow.json", "index.html", "bundle.js"])).toEqual([]);
  });
});
