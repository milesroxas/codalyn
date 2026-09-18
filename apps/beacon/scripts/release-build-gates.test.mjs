/**
 * Guards the release-bundle gates that keep Webflow Marketplace findings from shipping. These
 * live in the repo-root build scripts, but they are exercised from Beacon's suite because Beacon
 * is the app they gate and `pnpm test:run` runs inside the release pipeline (build-cli.mjs runs
 * lint + tests before the Vite build), so a broken gate fails the build it protects.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  archiveBaseName,
  assertPinnedMarkerCounts,
  assertRequiredReleaseEnv,
  collectForbiddenBundleMarkers,
  extractSourceMapsToPrivateZip,
  findSourceMapEntries,
  listDistSourceMaps,
  matchForbiddenMarker,
  pinnedMarkerCounts,
  pruneBundleArchives,
  referencedArchiveBaseNames,
  resolveViteEnvValue,
  rewriteSourceMapInsecureSchemes,
} from "../../../scripts/build-cli.mjs";
import { assertBundleOutputMatchesBuild } from "../../../scripts/extension-build.mjs";
import { minifyCssWithSourceMap } from "../../../scripts/vite-css-sourcemap-plugin.mjs";
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

  it("compiles the cleartext scheme out of the yandex bot user-agent entry (App Review Preflight: Insecure Protocols)", () => {
    expect(POSTHOG_MODULE_SOURCE).toContain('"http://yandex.com/bots",');
    const { code } = transform(POSTHOG_MODULE_SOURCE, POSTHOG_MODULE_ID, { strict: true });
    // Same substring match against the lowercased UA: the crawler is still recognised.
    expect(code).toContain('"yandex.com/bots",');
    expect(code).not.toMatch(/\b(?:http|ws):\/\/(?!www\.w3\.org\/)/i);
  });

  it("fails the release build when a vendor upgrade adds a cleartext-scheme URL", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe="http://example.com/collect";\n`;
    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: true })).toThrow(/insecure-scheme URL/);
    const ws = `${POSTHOG_MODULE_SOURCE}\nexport const probe="ws://example.com/live";\n`;
    expect(() => transform(ws, POSTHOG_MODULE_ID, { strict: true })).toThrow(/insecure-scheme URL/);
  });

  it("fails the release build when a vendor upgrade reintroduces an innerHTML write", () => {
    const moved = `${POSTHOG_MODULE_SOURCE}\nexport const probe=(e,h)=>{e.innerHTML=h};\n`;
    expect(() => transform(moved, POSTHOG_MODULE_ID, { strict: true })).toThrow(/HTML-injection sink write/);
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
  const REACT_DOM_CLIENT_DEV_ID = join(reactDomDir, "cjs/react-dom-client.development.js");
  const REACT_DOM_ID = join(reactDomDir, "cjs/react-dom.production.js");
  // Beacon no longer bundles better-auth (first-party session client, App Review Preflight 2026-09-14);
  // the rule stays for Flint, so the vendor file is resolved from Flint's install. better-auth's
  // exports map hides dist internals; walk from its resolved React client entry instead.
  const flintRequire = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../flint/package.json"));
  const BETTER_AUTH_URL_ID = join(dirname(flintRequire.resolve("better-auth/react")), "../../utils/url.mjs");

  it("compiles every innerHTML write out of react-dom's client bundle (App Review Preflight: Unsafe HTML Injection)", () => {
    const write = /\.innerHTML\s*=(?!=)/g;
    const prod = readFileSync(REACT_DOM_CLIENT_ID, "utf-8");
    const dev = readFileSync(REACT_DOM_CLIENT_DEV_ID, "utf-8");
    // The installed React writes innerHTML in exactly these places: the <script> creation trick
    // and the two dangerouslySetInnerHTML setters (plus the dev-only normalizeHTML helper).
    expect(prod.match(write)).toHaveLength(3);
    expect(dev.match(write)).toHaveLength(4);

    const prodOut = transform(prod, REACT_DOM_CLIENT_ID, { strict: true }).code;
    expect(prodOut).not.toMatch(write);
    expect(prodOut.match(/compiled out of this build/g)).toHaveLength(3);
    // Property-name switch labels and reads are not sinks and stay (a reviewer grep still sees the
    // word; the assignment is what the scanner and the residual guard match).
    expect(prodOut).toContain('case "innerHTML":');

    // Development channel is non-strict (react.dev links stay), but the rewrite still applies.
    const devOut = transform(dev, REACT_DOM_CLIENT_DEV_ID, { strict: false }).code;
    expect(devOut).not.toMatch(write);
    expect(devOut.match(/compiled out of this build/g)).toHaveLength(3);
  });

  it("fails the release build if a React upgrade moves an innerHTML write", () => {
    const moved = `${readFileSync(REACT_DOM_CLIENT_ID, "utf-8")}\nfunction probe(e,h){e.innerHTML=h}\n`;
    expect(() => transform(moved, REACT_DOM_CLIENT_ID, { strict: true })).toThrow(/HTML-injection sink write/);
  });

  it("leaves only W3C namespace URIs as http:// literals in react-dom", () => {
    const { code } = transform(readFileSync(REACT_DOM_CLIENT_ID, "utf-8"), REACT_DOM_CLIENT_ID, { strict: true });
    const insecure = code.match(/\b(?:http|ws):\/\/[^"'`\s]*/gi) ?? [];
    expect(insecure.length).toBeGreaterThan(0);
    expect(insecure.every((url) => url.startsWith("http://www.w3.org/"))).toBe(true);
  });

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

  it("catches the DOM-canvas pixel-readback family the preflight scanner treats as fingerprinting", () => {
    expect(matchForbiddenMarker("e.toBlob(e=>r(e),t,n)", forbidden)?.value).toBe(".toBlob(");
    expect(matchForbiddenMarker("c.toDataURL('image/png')", forbidden)?.value).toBe("toDataURL");
    expect(matchForbiddenMarker("ctx.getImageData(0,0,w,h)", forbidden)?.value).toBe("getImageData");
    // The offscreen encode path Beacon uses is allowed.
    expect(matchForbiddenMarker("await canvas.convertToBlob({type:t,quality:q})", forbidden)).toBeNull();
  });

  it("catches an http:// or ws:// URL but exempts the W3C namespace URIs React needs (App Review Preflight: Insecure Protocols)", () => {
    expect(matchForbiddenMarker('"http://yandex.com/bots"', forbidden)?.label).toMatch(/http:\/\//);
    expect(matchForbiddenMarker("HTTP://EXAMPLE.COM/x", forbidden)?.label).toMatch(/http:\/\//);
    expect(matchForbiddenMarker('new WebSocket("ws://example.com/live")', forbidden)?.label).toMatch(/ws:\/\//);
    expect(
      matchForbiddenMarker(
        'createElementNS("http://www.w3.org/2000/svg",a);"http://www.w3.org/1999/xlink";"http://www.w3.org/XML/1998/namespace"',
        forbidden
      )
    ).toBeNull();
    expect(matchForbiddenMarker('fetch("https://tower.codalyn.app/api")', forbidden)).toBeNull();
  });

  it("catches HTML-injection sink writes but not reads or property-name labels (App Review Preflight: Unsafe HTML Injection)", () => {
    expect(matchForbiddenMarker("e.innerHTML=n", forbidden)?.label).toMatch(/innerHTML/);
    expect(matchForbiddenMarker("el.outerHTML = html", forbidden)?.label).toMatch(/outerHTML/);
    expect(matchForbiddenMarker('el.insertAdjacentHTML("beforeend",h)', forbidden)?.label).toMatch(
      /insertAdjacentHTML/
    );
    expect(matchForbiddenMarker("document.write(h)", forbidden)?.label).toMatch(/document\.write/);
    // Reads, comparisons and switch labels are not sinks.
    expect(matchForbiddenMarker('let i=r.innerHTML;return i}case"innerHTML":x.innerHTML===""', forbidden)).toBeNull();
  });

  it("regex markers are honoured by the dist/zip output check too (a pattern marker has no `value` to substring-match)", () => {
    const expected = { version: "0.1.0", forbidden };
    // A clean bundle must pass: with `value` undefined a naive includes(undefined) would match the
    // literal "undefined" every real bundle contains.
    expect(() => assertBundleOutputMatchesBuild('var v="0.1.0";if(x===undefined){}', expected)).not.toThrow();
    expect(() => assertBundleOutputMatchesBuild('var v="0.1.0";fetch("http://example.com")', expected)).toThrow(
      /insecure http:\/\/ URL/
    );
    expect(() => assertBundleOutputMatchesBuild('var v="0.1.0";e.innerHTML=h', expected)).toThrow(/innerHTML/);
  });

  it("catches a leaked bundle map reference (.js.map / .css.map)", () => {
    expect(matchForbiddenMarker("//# sourceMappingURL=bundle.js.map", forbidden)?.label).toMatch(
      /leaked bundle source-map/
    );
    expect(matchForbiddenMarker("/*# sourceMappingURL=styles.css.map */", forbidden)?.label).toMatch(
      /leaked bundle source-map/
    );
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

describe("review round 8 (2026-09-17) release gates", () => {
  it("pins exactly two style-attribute writes in Beacon release output — the Designer API canvas placeholder calls (shipped CSP: style-src-attr 'none')", () => {
    const pinned = pinnedMarkerCounts("beacon", "production");
    const styleAttr = pinned.find((marker) => /style-attribute/.test(marker.label));
    expect(styleAttr?.expected).toBe(2);
    const twoCanvasWrites = `a.setAttribute("style", x); b.setAttribute('style', y); el.style.cssText = "a:b"; el.setAttribute("data-style", "x")`;
    expect(() => assertPinnedMarkerCounts(twoCanvasWrites, [styleAttr], "dist")).not.toThrow();
    expect(() =>
      assertPinnedMarkerCounts(`${twoCanvasWrites}; c.setAttribute("style", z)`, [styleAttr], "dist")
    ).toThrow(/style-attribute write/);
    expect(() => assertPinnedMarkerCounts(`a.setAttribute("style", x)`, [styleAttr], "dist")).toThrow(
      /style-attribute write/
    );
  });

  it("forbids a credential-named Web Storage key and a cookie-bearing request mode in Beacon release output (R8.10, External API Calls)", () => {
    const markers = collectForbiddenBundleMarkers(tempAppDir(), "production", "beacon");
    // The exact line App Review Preflight excerpted on the 09-17 16:38 build.
    expect(
      matchForbiddenMarker("var pl;try{localStorage.removeItem(`codalyn:beacon-tower-session-token`)}catch{}", markers)
        ?.label
    ).toMatch(/Web Storage/);
    expect(matchForbiddenMarker('sessionStorage.setItem("x-bearer", v)', markers)?.label).toMatch(/Web Storage/);
    expect(matchForbiddenMarker("localStorage.getItem( 'app_secret' )", markers)?.label).toMatch(/Web Storage/);
    // Preference, consent and sign-out flags are not credentials.
    expect(matchForbiddenMarker("localStorage.getItem(`codalyn:beacon-theme`)", markers)).toBeNull();
    expect(
      matchForbiddenMarker("localStorage.setItem(`codalyn:beacon-tower-suppress-designer-exchange`,`1`)", markers)
    ).toBeNull();
    expect(matchForbiddenMarker("localStorage.getItem(`codalyn:beacon-telemetry-opt-out`)", markers)).toBeNull();
    // Cookie-bearing request modes; the pinned omit and unrelated prose pass.
    expect(matchForbiddenMarker("fetch(e,{...t,credentials:`include`})", markers)?.label).toMatch(/cookie-bearing/);
    expect(matchForbiddenMarker('fetch(e,{credentials: "same-origin"})', markers)?.label).toMatch(/cookie-bearing/);
    expect(matchForbiddenMarker("fetch(e,{...t,redirect:`error`,credentials:`omit`})", markers)).toBeNull();
    expect(matchForbiddenMarker("Incorrect email or password.", markers)).toBeNull();
    expect(matchForbiddenMarker("flags bad credentials by code", markers)).toBeNull();
    // Development builds are not gated.
    expect(collectForbiddenBundleMarkers(tempAppDir(), "development", "beacon")).toEqual([]);
  });

  it("pins exactly one credentials: omit in Beacon release output — the egress point's cookie pin (R8.10)", () => {
    const pinned = pinnedMarkerCounts("beacon", "production");
    const omit = pinned.find((marker) => /credentials: omit/.test(marker.label));
    expect(omit?.expected).toBe(1);
    expect(() =>
      assertPinnedMarkerCounts("fetch(e,{...t,redirect:`error`,credentials:`omit`})", [omit], "dist")
    ).not.toThrow();
    expect(() => assertPinnedMarkerCounts("fetch(e,{...t,redirect:`error`})", [omit], "dist")).toThrow(
      /0 credentials: omit request options, expected exactly 1/
    );
    expect(() =>
      assertPinnedMarkerCounts('a({credentials:`omit`});b({credentials: "omit"})', [omit], "Archived zip")
    ).toThrow(/2 credentials: omit request options, expected exactly 1/);
  });

  it("forbids any PostHog trace in a release bundle unless VITE_BEACON_TELEMETRY_ENABLED=true", () => {
    const appPath = tempAppDir();
    const off = collectForbiddenBundleMarkers(appPath, "production", "beacon");
    expect(matchForbiddenMarker("https://us.i.posthog.com/e/", off)?.label).toMatch(/PostHog/);
    expect(matchForbiddenMarker("processed by PostHog", off)?.label).toMatch(/PostHog/);

    writeFileSync(join(appPath, ".env.production"), "VITE_BEACON_TELEMETRY_ENABLED=true\n");
    const on = collectForbiddenBundleMarkers(appPath, "production", "beacon");
    expect(matchForbiddenMarker("https://us.i.posthog.com/e/", on)).toBeNull();
  });

  it("refuses a release build that bundles telemetry or writes localized sites' primary locale", () => {
    const appPath = tempAppDir();
    expect(() =>
      assertRequiredReleaseEnv({
        appName: "beacon",
        appPath,
        channel: "production",
        inlineEnv: { VITE_BEACON_TELEMETRY_ENABLED: "true" },
      })
    ).toThrow(/VITE_BEACON_TELEMETRY_ENABLED/);
    expect(() =>
      assertRequiredReleaseEnv({
        appName: "beacon",
        appPath,
        channel: "preview",
        inlineEnv: { VITE_BEACON_LOCALIZED_SITE_CMS_WRITES: "primary" },
      })
    ).toThrow(/VITE_BEACON_LOCALIZED_SITE_CMS_WRITES/);
    // Unset (the Marketplace state) and the explicit reduced values pass.
    expect(() =>
      assertRequiredReleaseEnv({ appName: "beacon", appPath, channel: "production", inlineEnv: {} })
    ).not.toThrow();
    expect(() =>
      assertRequiredReleaseEnv({
        appName: "beacon",
        appPath,
        channel: "production",
        inlineEnv: { VITE_BEACON_TELEMETRY_ENABLED: "false", VITE_BEACON_LOCALIZED_SITE_CMS_WRITES: "blocked" },
      })
    ).not.toThrow();
    // Development builds may run with either value.
    expect(() =>
      assertRequiredReleaseEnv({
        appName: "beacon",
        appPath,
        channel: "development",
        inlineEnv: { VITE_BEACON_TELEMETRY_ENABLED: "true" },
      })
    ).not.toThrow();
  });
});

describe("pinnedMarkerCounts (App Review Preflight: External API Calls / Silent Canvas Mutations)", () => {
  const pinned = pinnedMarkerCounts("beacon", "production");
  const clean =
    // The egress point: redirect and cookie modes pinned on the one platform fetch (R8.3 / R8.10).
    "async function a(e,t){return fetch(e,{...t,redirect:`error`,credentials:`omit`})}" +
    // The two Designer API canvas placeholder writes (review round 8, CSP style-src-attr 'none').
    `r.setAttribute("style",ph());await d.setAttribute("style",ph())` +
    // The published-site runtime's source-map trailer builder: the pragma ships as two halves, never the token.
    ";const T=[`//# source`,`MappingURL=`];";

  it("pins one bare fetch(, no MutationObserver construction, two canvas style-attribute writes, one credentials: omit and no sourceMappingURL token in Beacon release output", () => {
    expect(pinned.map((m) => [m.label, m.expected])).toEqual([
      ["bare fetch( call", 1],
      ["MutationObserver construction", 0],
      ["style-attribute write (setAttribute)", 2],
      ["credentials: omit request option", 1],
      ["sourceMappingURL token", 0],
    ]);
    expect(() => assertPinnedMarkerCounts(clean, pinned, "Build output")).not.toThrow();
  });

  it("fails the build when any sourceMappingURL token ships — Preflight reads what follows it as a map name", () => {
    // The literal the trailer builder used to minify to: scanned as a map called "`;function".
    const literal = `${clean}var M=\`//# sourceMappingURL=\`;function N(){}`;
    expect(() => assertPinnedMarkerCounts(literal, pinned, "Build output")).toThrow(
      /1 sourceMappingURL token, expected exactly 0/
    );
    const leaked = `${clean}\n//# sourceMappingURL=label-abc.js.map`;
    expect(() => assertPinnedMarkerCounts(leaked, pinned, "Archived zip")).toThrow(
      /1 sourceMappingURL token, expected exactly 0/
    );
  });

  it("fails the build when a second fetch call site appears anywhere in the artifact", () => {
    const leaked = `${clean};await fetch("https://api.example.com/collect",{method:"POST"})`;
    expect(() => assertPinnedMarkerCounts(leaked, pinned, "Archived zip")).toThrow(
      /Archived zip contains 2 bare fetch\( calls, expected exactly 1 \(the single egress point/
    );
  });

  it("fails the build when a dependency adds a MutationObserver", () => {
    // Lexical's editor observer is the shape this pin exists for; it is flag-gated out of Marketplace
    // bundles (R8.8), so even one construction now fails the build.
    const leaked = `${clean};e._observer=new MutationObserver((t,n)=>{yt(e,t,n)})`;
    expect(() => assertPinnedMarkerCounts(leaked, pinned, "Build output")).toThrow(
      /1 MutationObserver construction, expected exactly 0/
    );
  });

  it("fails when the inventory shrinks too, so the compliance doc is updated with it", () => {
    expect(() => assertPinnedMarkerCounts("fetch(e)", pinned, "Build output")).toThrow(
      /0 style-attribute write \(setAttribute\)s, expected exactly 2/
    );
  });

  it("does not count property calls, longer identifiers, or posthog's transport name", () => {
    const noise = `${clean};window.fetch(e);globalThis.fetch(e);towerFetch(e);refetch();Ye=Ke?.fetch;t.transport="fetch"`;
    expect(() => assertPinnedMarkerCounts(noise, pinned, "Build output")).not.toThrow();
  });

  it("is inert for development builds and for Flint", () => {
    expect(pinnedMarkerCounts("beacon", "development")).toEqual([]);
    expect(pinnedMarkerCounts("flint", "production")).toEqual([]);
    expect(() => assertPinnedMarkerCounts("fetch(a);fetch(b)", [], "Build output")).not.toThrow();
  });
});

describe("bundle retention (pruneBundleArchives)", () => {
  const BUILDS = [
    "v0.1.0_public_09-14_12-08-01", // scanned — referenced by a doc
    "v0.1.0_public_09-14_12-46-23", // intermediate rebuild
    "v0.1.0_public_09-14_12-50-36", // scanned — referenced
    "v0.1.0_public_09-14_13-22-03", // newest 2
    "v0.1.0_public_09-15_09-00-00", // newest 2
  ];

  function seed() {
    const outDir = join(tempAppDir(), "bundle", "production", "public");
    mkdirSync(outDir, { recursive: true });
    for (const base of BUILDS) {
      writeFileSync(join(outDir, `${base}.zip`), "zip");
      writeFileSync(join(outDir, `${base}.sourcemaps.zip`), "maps");
    }
    writeFileSync(join(outDir, "notes.txt"), "not a build");
    return outDir;
  }

  it("parses both archive file names to one base name and ignores everything else", () => {
    expect(archiveBaseName("v0.1.0_public_09-14_13-22-03.zip")).toBe("v0.1.0_public_09-14_13-22-03");
    expect(archiveBaseName("v0.1.0_public_09-14_13-22-03.sourcemaps.zip")).toBe("v0.1.0_public_09-14_13-22-03");
    expect(archiveBaseName("bundle.zip")).toBeNull();
    expect(archiveBaseName("notes.txt")).toBeNull();
  });

  it("collects every build a Markdown doc names, from either file name, recursively", () => {
    const docs = join(tempAppDir(), "docs");
    mkdirSync(join(docs, "nested"), { recursive: true });
    writeFileSync(join(docs, "a.md"), "scan target `v0.1.0_public_09-14_12-08-01.zip` (sha …)");
    writeFileSync(
      join(docs, "nested", "b.md"),
      "maps `v0.1.0_internal_09-14_11-32-46.sourcemaps.zip`; bare v0.1.0_public_01-01_00-00-00 is prose"
    );
    writeFileSync(join(docs, "c.txt"), "v0.1.0_public_02-02_00-00-00.zip");
    expect([...referencedArchiveBaseNames(docs)].sort()).toEqual([
      "v0.1.0_internal_09-14_11-32-46",
      "v0.1.0_public_09-14_12-08-01",
    ]);
    expect(referencedArchiveBaseNames(join(docs, "missing")).size).toBe(0);
  });

  it("keeps the newest builds, archives doc-referenced older ones as pairs, deletes the rest", () => {
    const outDir = seed();
    const archiveDir = join(outDir, "..", "..", "archive", "production", "public");
    const result = pruneBundleArchives({
      outDir,
      archiveDir,
      keepNewest: 2,
      referenced: new Set(["v0.1.0_public_09-14_12-08-01", "v0.1.0_public_09-14_12-50-36"]),
    });
    expect(result).toEqual({
      kept: ["v0.1.0_public_09-14_13-22-03", "v0.1.0_public_09-15_09-00-00"],
      archived: ["v0.1.0_public_09-14_12-08-01", "v0.1.0_public_09-14_12-50-36"],
      deleted: ["v0.1.0_public_09-14_12-46-23"],
    });
    expect(readdirSync(outDir).sort()).toEqual([
      "notes.txt",
      "v0.1.0_public_09-14_13-22-03.sourcemaps.zip",
      "v0.1.0_public_09-14_13-22-03.zip",
      "v0.1.0_public_09-15_09-00-00.sourcemaps.zip",
      "v0.1.0_public_09-15_09-00-00.zip",
    ]);
    expect(readdirSync(archiveDir).sort()).toEqual([
      "v0.1.0_public_09-14_12-08-01.sourcemaps.zip",
      "v0.1.0_public_09-14_12-08-01.zip",
      "v0.1.0_public_09-14_12-50-36.sourcemaps.zip",
      "v0.1.0_public_09-14_12-50-36.zip",
    ]);
  });

  it("is a no-op with fewer builds than the keep window, or no output dir", () => {
    const outDir = seed();
    const result = pruneBundleArchives({
      outDir,
      archiveDir: join(outDir, "archive"),
      keepNewest: 10,
      referenced: new Set(),
    });
    expect(result.archived).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(readdirSync(outDir)).toHaveLength(11);
    expect(
      pruneBundleArchives({ outDir: join(outDir, "nope"), archiveDir: outDir, keepNewest: 2, referenced: new Set() })
    ).toEqual({
      kept: [],
      archived: [],
      deleted: [],
    });
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

  it("rewrites cleartext http:// links in embedded source text, keeping W3C namespaces (App Review Preflight: Insecure Protocols)", () => {
    const map = {
      version: 3,
      sources: ["spark-md5.js", "react-dom.js", "no-content.js"],
      sourcesContent: [
        "// see http://jsperf.com/md5-shootout/7 and HTTP://example.com/x\nvar a = 1;",
        'createElementNS("http://www.w3.org/2000/svg", t)',
        null,
      ],
      mappings: "AAAA",
    };
    const out = rewriteSourceMapInsecureSchemes(map);
    expect(out.sourcesContent[0]).toBe(
      "// see https://jsperf.com/md5-shootout/7 and https://example.com/x\nvar a = 1;"
    );
    expect(out.sourcesContent[1]).toBe('createElementNS("http://www.w3.org/2000/svg", t)');
    expect(out.sourcesContent[2]).toBeNull();
    expect(out.mappings).toBe("AAAA");
    expect(rewriteSourceMapInsecureSchemes({ version: 3 })).toEqual({ version: 3 });
  });

  it("the private map zip carries no cleartext http:// link once extracted", () => {
    const appPath = tempAppDir();
    fakeDist(appPath, {
      "bundle.js": "console.log(1)",
      "bundle.js.map": JSON.stringify({
        version: 3,
        sources: ["a.js"],
        sourcesContent: ["// http://reference.example/doc\nvar a = 'http://www.w3.org/2000/svg';"],
        mappings: "AAAA",
      }),
    });
    const archive = join(appPath, "bundle", "production", "public", "v0.0.0_public_x.sourcemaps.zip");
    extractSourceMapsToPrivateZip(appPath, archive, { strict: true });
    const text = execSync(`unzip -p ${JSON.stringify(archive)} bundle.js.map`, { encoding: "utf-8" });
    expect(text).toContain("https://reference.example/doc");
    expect(text).toContain("http://www.w3.org/2000/svg");
    expect(text).not.toMatch(/\bhttp:\/\/(?!www\.w3\.org\/)/i);
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

describe("CSS source map (Marketplace submission form + App Review Preflight: traceable generated files)", () => {
  const readable = `/* readable */\n:root {\n  --brand: #ff0000;\n}\n.button {\n  color: var(--brand);\n  padding: 0px 0px;\n}\n`;

  it("minifies the readable stylesheet and emits a complete version-3 map that embeds it as the source", () => {
    const { code, map } = minifyCssWithSourceMap({ fileName: "styles.css", code: readable });
    expect(code).not.toContain("\n");
    expect(code).toContain(".button{");
    expect(code).not.toContain("sourceMappingURL");
    expect(map.version).toBe(3);
    expect(map.file).toBe("styles.css");
    expect(map.sources).toHaveLength(1);
    expect(map.sourcesContent).toEqual([readable]);
    expect(map.mappings.length).toBeGreaterThan(0);
    expect(Array.isArray(map.names)).toBe(true);
  });

  it("is picked up by the source-map extraction alongside the JS maps", () => {
    const appPath = tempAppDir();
    const { code, map } = minifyCssWithSourceMap({ fileName: "styles.css", code: readable });
    for (const [rel, contents] of Object.entries({
      "bundle.js": "console.log(1)",
      "bundle.js.map": '{"version":3}',
      "styles.css": code,
      "styles.css.map": JSON.stringify(map),
    })) {
      mkdirSync(join(appPath, "dist"), { recursive: true });
      writeFileSync(join(appPath, "dist", rel), contents);
    }
    const archive = join(appPath, "bundle", "production", "public", "v0.0.0_public_x.sourcemaps.zip");
    expect(extractSourceMapsToPrivateZip(appPath, archive)).toBe(archive);
    const entries = execSync(`unzip -Z1 ${JSON.stringify(archive)}`, { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean)
      .sort();
    expect(entries).toEqual(["bundle.js.map", "styles.css.map"]);
    expect(existsSync(join(appPath, "dist", "styles.css"))).toBe(true);
    expect(existsSync(join(appPath, "dist", "styles.css.map"))).toBe(false);
  });
});
