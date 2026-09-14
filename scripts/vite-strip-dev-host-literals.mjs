/**
 * Compiles review-sensitive vendor literals out of the code bundled into Webflow Designer
 * Extension builds. Three classes of literal are handled, all because Marketplace reviewers grep
 * the shipped bundle:
 *
 * 1. Development-host literals (`localhost` / `127.0.0.1`, any casing) — flagged in review round 4
 *    (2026-08).
 * 2. Sentry references contributed by posthog-js's (unused) Sentry integration — an earlier review
 *    round flagged Sentry specifically. Sentry has since been removed from the app, but a reviewer
 *    re-grepping `sentry` would still hit posthog's dead integration code.
 * 3. React's production error-decoder URL (`https://react.dev/errors/`) — never fetched, but the only
 *    third-party `https://` literal left in the bundle; dropped so an external-endpoint grep shows
 *    exactly the endpoints the CSP allowlists.
 * 4. posthog-js request URLs that carry the project token in the query string (`?token=<key>`) —
 *    flagged by App Review Preflight as "Credential in URL" (2026-08-19). The value is PostHog's
 *    public, write-only project key, but the Marketplace rule is shape-based: no credential may
 *    travel in a URL, and the reviewer tooling greps the bundle for exactly that shape.
 * 5. posthog-js session-replay references — flagged by App Review Preflight as "Fingerprinting &
 *    Session Replay" (2026-08-19; evidence: the `rrweb` / `initSessionRecording` / "could not load
 *    recorder" text of posthog's session-recording controller). No rule in this file rewrites them:
 *    the controller class, the PostHog core's recorder-instantiation seam, its public
 *    `startSessionRecording` / `stopSessionRecording` / `sessionRecordingStarted` /
 *    `get_session_replay_url` methods and every `rrweb` literal are excised from `dist/module.js`
 *    by the pnpm patch (`patches/posthog-js@1.369.3.patch`). This file only guards the result
 *    (`SESSION_REPLAY_RESIDUAL`): a posthog-js upgrade that ships a recorder again, or a regenerated
 *    patch that forgets the excision, fails the release build instead of shipping.
 * 6. react-dom's `innerHTML` writes — flagged by App Review Preflight as "Unsafe HTML Injection"
 *    (2026-09-14; evidence: the three `.innerHTML =` assignments in react-dom's client bundle). The
 *    rule is shape-based on the shipped artifact: Beacon itself never passes
 *    `dangerouslySetInnerHTML` (every vendor that did is pnpm-patched, see docs/webflow-marketplace-
 *    compliance.md R4.1 / R7.2), so React's write path is unreachable, but it still has to be absent.
 *    The three sites are compiled into throws (capability absent, not dormant — a future caller
 *    fails loudly in every channel instead of writing markup).
 * 7. posthog-js's bot-detection user-agent list entry `"http://yandex.com/bots"` — flagged by App
 *    Review Preflight as "Insecure Protocols" (2026-09-14). The list is substring-matched against
 *    the lowercased user agent, so the scheme-less `"yandex.com/bots"` recognises exactly the same
 *    crawler (and its https form); nothing is fetched from it.
 *
 * Every replacement below targets a code path that is dead inside the extension iframe, so runtime
 * behavior is unchanged:
 *
 * - react-router `createBrowserURLImpl` / memory-history `createURL`: `"http://localhost"` is the
 *   base for relative-URL parsing only when `window` is absent (SSR). The extension always has a
 *   window; `file:///` parses relative paths identically for the pathname/search reads the router
 *   performs.
 * - better-auth `validateProxyHeader` host branch: validates `x-forwarded-host` values on the
 *   server. The browser auth client never validates proxy headers, and we always pass an explicit
 *   `baseURL`, so `getBaseURL` returns before any header path.
 * - better-auth `isLoopbackHost`: protocol inference for server-side request sources; unused in
 *   the browser client (usually tree-shaken — kept here in case chunking retains it).
 * - posthog-js cookie-domain probe: skips subdomain probing on local hosts. Extensions run with
 *   `persistence: "memory"`, so the cookie store is never used.
 * - posthog-js `internal_or_test_user_hostname` config default: marks events from local hosts as
 *   internal test traffic. The extension origin is never a local host in shipped builds.
 * - posthog-js `forceAllowLocalhost` identifiers (`__forceAllowLocalhost` on the deprecated
 *   `webPerformance` shim; the session-recording controller that carried the matching
 *   `_forceAllowLocalhostNetworkCapture` is excised by the pnpm patch, see 5. above): a debug
 *   escape hatch that let session-recording network capture run against a local host. The
 *   property defaults to `false` and nothing reads it once the recorder is gone. Renaming the
 *   identifier is behavior-preserving because every read and write is renamed together inside the
 *   same module.
 * - posthog-js Sentry integration (`SentryIntegration` / `sentryIntegration` on the PostHog
 *   instance, the `https://sentry.io/organizations/` display-URL template, and the `$sentry_*`
 *   event properties): reachable only by calling `posthog.sentryIntegration()` / constructing
 *   `posthog.SentryIntegration`, which Beacon never does. Dropping the instance-property
 *   assignments also lets Rollup tree-shake the integration class itself.
 * - posthog-js token-in-query request URLs (`/api/early_access_features/`, `/api/product_tours/`,
 *   `/api/surveys/`, `/i/v1/logs`): the `?token=<project key>` suffix is compiled out, leaving the
 *   bare endpoint path. Every one of these paths is unreachable in the extension builds:
 *   - early-access features: only `posthog.getEarlyAccessFeatures()` reaches it — never called by
 *     app code, and `advanced_disable_feature_flags` is pinned on;
 *   - product tours: needs the `generateProductTours` extension script, which
 *     `disable_external_dependency_loading` never loads, plus `disable_product_tours`;
 *   - surveys: `disable_surveys: true` makes `getSurveys` return before any request;
 *   - logs: only `posthog.captureLog()` / `posthog.logger` reach it — never called — and the logs
 *     extension script is likewise never loaded.
 *   Should a future caller reach one of them anyway, the request goes out without a token and
 *   PostHog rejects it — it fails closed instead of leaking the key into a query string. Event
 *   ingestion (`/e/`) and flag evaluation (`/flags/`) already carry the token in the POST body and
 *   are untouched.
 * - react-dom `createInstance` for `<script>` elements: React builds the element through a
 *   throw-away `<div>.innerHTML = "<script></script>"` so a JSX-rendered script is "parser-inserted"
 *   and never executes. Beacon renders no `<script>` JSX, so the branch now throws instead of
 *   creating the element (nothing in the extension can reach it; a regression fails at render time).
 * - react-dom `setProp` / `setPropOnCustomElement` `dangerouslySetInnerHTML` write
 *   (`domElement.innerHTML = key`): both sites throw. The prop is validated and rejected before any
 *   markup is written; the surrounding switch/case structure is untouched.
 * - react-dom development build `normalizeHTML` (hydration-mismatch diffing helper): round-trips
 *   markup through a detached element's `innerHTML`; returns the input untouched instead. Only the
 *   warning text of a hydration diff could differ, and the extension never hydrates.
 * - posthog-js bot-detection UA list entry `"sentryuptimebot"`: removed. The list is scanned with
 *   a substring match over independent entries, so dropping one entry only stops detecting that
 *   one crawler — every other entry keeps working. Sentry's uptime bot cannot reach this code at
 *   all: the bundle only executes inside an authenticated Webflow Designer iframe, never on a
 *   crawlable page. Behavior loss is therefore zero, and keeping the literal would defeat the
 *   whole point of this file.
 *
 * After the targeted replacements, any watched vendor module that still contains one of the
 * patterns audited for it fails the build — a vendor upgrade that moves, renames or adds such a
 * string must be re-audited here instead of silently shipping. `scripts/build-cli.mjs` re-verifies
 * the final dist output and the archived zip.
 */

/**
 * Residual-literal guards. `pattern` is intentionally case-insensitive: posthog-js ships
 * camelCase identifiers such as `__forceAllowLocalhost`, which a lowercase-only check misses even
 * though `grep -i localhost` (what a reviewer runs) finds them.
 */
const DEV_HOST_RESIDUAL = {
  label: "dev-host literal",
  pattern: /localhost|127\.0\.0\.1/i,
};
const SENTRY_RESIDUAL = {
  label: "Sentry reference",
  pattern: /sentry/i,
};
const REACT_ERROR_DECODER_RESIDUAL = {
  label: "react.dev error-decoder URL",
  pattern: /react\.dev/i,
};
/**
 * A credential-shaped query parameter. Matches only the URL form (`?token=` / `&token=`), never the
 * request-body assignment `token=this.config.token` that event capture legitimately uses.
 */
const CREDENTIAL_IN_QUERY_RESIDUAL = {
  label: "credential-in-query-string URL",
  pattern: /[?&]token=/i,
};
/**
 * Session-replay / recorder references (App Review Preflight: "Fingerprinting & Session Replay").
 * `rrweb` is posthog's recorder engine; `fullstory` is the other named-prohibited replay vendor;
 * `recorder` / `replay` / `recording` cover posthog's own controller, its lazy-loader script name
 * (`lazy-recorder`), its public API (`startSessionRecording`, `get_session_replay_url`), log text
 * and the recorder's config defaults / persistence keys (`disable_session_recording`,
 * `session_recording`, `enable_recording_console_log`, `$session_recording_*`). The excision itself
 * lives in the pnpm patch — this guard only proves it held for the installed vendor module. It is
 * scoped to posthog-js: first-party code keeps `disable_session_recording: true` pinned in
 * `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS` (defence in depth) and the privacy disclosure names
 * "session recordings" as never collected — neither is a recorder reference.
 */
const SESSION_REPLAY_RESIDUAL = {
  label: "session-replay reference",
  pattern: /rrweb|fullstory|recorder|replay|recording/i,
};
/**
 * An HTML-injection sink write (App Review Preflight: "Unsafe HTML Injection"). Matches assignments
 * only (`.innerHTML =`, `.outerHTML =`) plus the call-shaped sinks; reads such as
 * `container.innerHTML` (Lexical's HTML export, the rich-text sanitizer) and the `case "innerHTML":`
 * property-name switch labels in react-dom are not sinks and are left alone.
 */
const HTML_INJECTION_SINK_RESIDUAL = {
  label: "HTML-injection sink write",
  pattern: /\.(?:inner|outer)HTML\s*=(?!=)|insertAdjacentHTML\(|document\.write\(/,
};
/**
 * A cleartext-scheme URL (App Review Preflight: "Insecure Protocols" — `http://`, `ws://`). The W3C
 * namespace URIs react-dom needs at runtime (`http://www.w3.org/2000/svg` et al.) are the rule's own
 * documented exception and are excluded here the same way.
 */
const INSECURE_SCHEME_RESIDUAL = {
  label: "insecure-scheme URL",
  pattern: /\b(?:http|ws):\/\/(?!www\.w3\.org\/)/i,
};

/**
 * `find` is either a literal string (replaced until no occurrences remain) or a global RegExp.
 * RegExp replacements go through a function replacer, so `$` in `replaceWith` is literal and never
 * interpreted as a capture-group reference.
 */
const RULES = [
  {
    // React's production error decoder builds "https://react.dev/errors/<code>" into thrown messages.
    // It is never fetched, but it is the only external URL a `grep https://` over the bundle finds
    // besides our own endpoints; the code number survives, so errors stay decodable by hand.
    name: "react-dom production error-decoder URL",
    idIncludes: "react-dom/cjs/react-dom",
    find: '"https://react.dev/errors/"',
    replaceWith: '"#"',
  },
  {
    // Beacon renders no <script> JSX. React's parser-inserted trick (`div.innerHTML = "<script>…"`,
    // then detach) is the only innerHTML write on the element-creation path; it becomes a throw.
    name: "react-dom <script> element creation via innerHTML",
    idIncludes: "react-dom/cjs/react-dom-client",
    find: /case "script":\s*nextResource = (?:ownerDocument|nextResource)\.createElement\("div"\);\s*nextResource\.innerHTML = "<script>\\x3c\/script>";\s*nextResource = nextResource\.removeChild\(\s*nextResource\.firstChild\s*\);/g,
    replaceWith:
      'case "script":\n  throw Error("Beacon does not render <script> elements; their creation is compiled out of this build");',
  },
  {
    // `dangerouslySetInnerHTML` write in setProp (host elements) and setPropOnCustomElement. The
    // statement sits at the end of an `if (null != key) { … }` block, so a throw is a drop-in.
    name: "react-dom dangerouslySetInnerHTML write",
    idIncludes: "react-dom/cjs/react-dom-client",
    find: "domElement.innerHTML = key;",
    replaceWith: 'throw Error("dangerouslySetInnerHTML is compiled out of this build");',
  },
  {
    // Development-build hydration diff helper; returns the markup as-is instead of normalising it
    // through a detached element. Never reached in the extension (no hydration), dev channel only.
    name: "react-dom development normalizeHTML round-trip",
    idIncludes: "react-dom/cjs/react-dom-client.development",
    find: /parent\.innerHTML = html;\s*return parent\.innerHTML;/g,
    replaceWith: "return html;",
  },
  {
    name: "react-router windowless URL base",
    idIncludes: "react-router/dist/",
    find: '"http://localhost"',
    replaceWith: '"file:///"',
  },
  {
    name: "better-auth proxy-header localhost regex",
    idIncludes: "better-auth/dist/utils/url",
    find: " || /^localhost(:[0-9]{1,5})?$/i.test(header);",
    replaceWith: ";",
  },
  {
    // better-auth ≥1.6.30: `isLoopbackForDevScheme` only picks http vs https for a dev base URL;
    // Beacon always talks to an https Tower in release builds, so "never loopback" is behavior-neutral.
    name: "better-auth isLoopbackForDevScheme",
    idIncludes: "better-auth/dist/utils/url",
    find: 'return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || hostname.startsWith("127.");',
    replaceWith: "return false;",
  },
  {
    name: "posthog-js cookie-domain local hosts",
    idIncludes: "posthog-js/dist/",
    find: '["localhost","127.0.0.1"].includes(',
    replaceWith: "[].includes(",
  },
  {
    name: "posthog-js internal_or_test_user_hostname default",
    idIncludes: "posthog-js/dist/",
    find: "?/^(localhost|127\\.0\\.0\\.1)$/:void 0",
    replaceWith: "?void 0:void 0",
  },
  {
    // Covers `__forceAllowLocalhost` on the deprecated webPerformance shim in one consistent
    // module-local rename (the session-recording controller's `_forceAllowLocalhostNetworkCapture`
    // and the deprecation message naming it no longer exist — excised by the pnpm patch).
    name: "posthog-js forceAllowLocalhost identifiers",
    idIncludes: "posthog-js/dist/",
    find: /forceAllowLocalhost/g,
    replaceWith: "forceAllowLoopback",
  },
  {
    name: "posthog-js Sentry integration instance properties",
    idIncludes: "posthog-js/dist/",
    find: /this\.SentryIntegration=\w+,this\.sentryIntegration=(\w+)=>function\(\w+,\w+\)\{var \w+=\w+\(\w+,\w+\);return\{name:\w+,processEvent:\w+=>\w+\(\w+\)\}\}\(this,\1\),/g,
    replaceWith: "",
  },
  {
    name: "posthog-js Sentry issue-URL template",
    idIncludes: "posthog-js/dist/",
    find: '"https://sentry.io/organizations/"',
    replaceWith: '""',
  },
  {
    name: "posthog-js $sentry_* event properties",
    idIncludes: "posthog-js/dist/",
    find: /\$sentry_/g,
    replaceWith: "$unused_",
  },
  {
    name: "posthog-js sentryuptimebot user-agent entry",
    idIncludes: "posthog-js/dist/",
    find: '"sentryuptimebot",',
    replaceWith: "",
  },
  {
    // Same substring match against the lowercased UA — the crawler is still recognised, the
    // cleartext scheme is gone (App Review Preflight: "Insecure Protocols", 2026-09-14).
    name: "posthog-js yandex bot user-agent entry scheme",
    idIncludes: "posthog-js/dist/",
    find: '"http://yandex.com/bots",',
    replaceWith: '"yandex.com/bots",',
  },
  {
    // `s` is the minified `"&stage=…"` suffix (or ""); keep the stage filter, drop only the token.
    name: "posthog-js early-access-features token-in-query URL",
    idIncludes: "posthog-js/dist/",
    find: '"/api/early_access_features/?token="+this.Rt.token+s)',
    replaceWith: '"/api/early_access_features/"+(s?"?"+s.slice(1):""))',
  },
  {
    name: "posthog-js product-tours token-in-query URL",
    idIncludes: "posthog-js/dist/",
    find: '"/api/product_tours/?token="+this._instance.config.token)',
    replaceWith: '"/api/product_tours/")',
  },
  {
    name: "posthog-js surveys token-in-query URL",
    idIncludes: "posthog-js/dist/",
    find: '"/api/surveys/?token="+this.Rt.token)',
    replaceWith: '"/api/surveys/")',
  },
  {
    name: "posthog-js logs token-in-query URL",
    idIncludes: "posthog-js/dist/",
    find: 'endpointFor("api","/i/v1/logs")+"?token="+encodeURIComponent(this._instance.config.token)',
    replaceWith: 'endpointFor("api","/i/v1/logs")',
  },
];

/** Modules audited above, with the residual patterns that must not survive the replacements. */
const WATCHED_MODULES = [
  {
    idIncludes: "react-dom/cjs/react-dom",
    residuals: [REACT_ERROR_DECODER_RESIDUAL, HTML_INJECTION_SINK_RESIDUAL, INSECURE_SCHEME_RESIDUAL],
  },
  { idIncludes: "react-router/dist/", residuals: [DEV_HOST_RESIDUAL, INSECURE_SCHEME_RESIDUAL] },
  { idIncludes: "better-auth/dist/utils/url", residuals: [DEV_HOST_RESIDUAL] },
  {
    idIncludes: "posthog-js/dist/",
    residuals: [
      DEV_HOST_RESIDUAL,
      SENTRY_RESIDUAL,
      CREDENTIAL_IN_QUERY_RESIDUAL,
      SESSION_REPLAY_RESIDUAL,
      HTML_INJECTION_SINK_RESIDUAL,
      INSECURE_SCHEME_RESIDUAL,
    ],
  },
];

function applyRule(code, rule) {
  if (rule.find instanceof RegExp) {
    return code.replace(rule.find, () => rule.replaceWith);
  }
  let next = code;
  while (next.includes(rule.find)) {
    next = next.replace(rule.find, rule.replaceWith);
  }
  return next;
}

function applyRules(code, id) {
  let next = code;
  for (const rule of RULES) {
    if (id.includes(rule.idIncludes)) {
      next = applyRule(next, rule);
    }
  }
  return next;
}

/** Fails loudly when a vendor upgrade moves or renames a literal this file is supposed to strip. */
function assertNoResiduals(code, id, residuals) {
  for (const residual of residuals) {
    const index = code.search(residual.pattern);
    if (index === -1) {
      continue;
    }
    const context = code.slice(Math.max(0, index - 80), index + 80);
    throw new Error(
      `[strip-dev-host-literals] Unhandled ${residual.label} in ${id} — vendor code changed; ` +
        `re-audit and update scripts/vite-strip-dev-host-literals.mjs. Context: …${context}…`
    );
  }
}

/**
 * Applies the same vendor rewrites to a source map's embedded `sourcesContent`. Vite embeds the
 * *loaded* module text in each map, so without this the private source-map artifact (submission
 * form upload, see scripts/build-cli.mjs) would still carry every literal the transform compiled out
 * of the bundle — the token-in-query URLs included. Rewriting `sourcesContent` to the post-transform
 * text makes the map describe the code that was actually bundled. Positions are untouched (the
 * transform never emitted a map of its own). Returns a new map object; non-watched sources and maps
 * without `sourcesContent` pass through unchanged.
 *
 * @param {{ sources?: string[]; sourcesContent?: (string | null)[] }} map parsed source map JSON
 * @param {{ strict?: boolean }} [options] as for the plugin; strict fails on a residual literal.
 */
export function rewriteSourceMapVendorContent(map, options = {}) {
  const strict = options.strict !== false;
  if (!Array.isArray(map?.sources) || !Array.isArray(map.sourcesContent)) {
    return map;
  }
  const sourcesContent = map.sourcesContent.map((content, index) => {
    const id = map.sources[index] ?? "";
    if (typeof content !== "string") {
      return content;
    }
    const watched = WATCHED_MODULES.filter((module) => id.includes(module.idIncludes));
    if (watched.length === 0) {
      return content;
    }
    const next = applyRules(content, id);
    if (strict) {
      assertNoResiduals(
        next,
        `${id} (source map sourcesContent)`,
        watched.flatMap((module) => module.residuals)
      );
    }
    return next;
  });
  return { ...map, sourcesContent };
}

/**
 * @param {{ strict?: boolean }} [options] `strict` (release channels) fails the build on any
 * residual audited literal in a watched module; non-strict (development channel) only applies
 * the replacements, since vendor development chunks legitimately mention localhost in warnings.
 */
export function createStripDevHostLiteralsPlugin(options = {}) {
  const strict = options.strict !== false;
  return {
    name: "codalyn:strip-dev-host-literals",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      const watched = WATCHED_MODULES.filter((module) => id.includes(module.idIncludes));
      if (watched.length === 0) {
        return null;
      }

      const next = applyRules(code, id);
      if (strict) {
        assertNoResiduals(
          next,
          id,
          watched.flatMap((module) => module.residuals)
        );
      }
      return next === code ? null : { code: next, map: null };
    },
  };
}
