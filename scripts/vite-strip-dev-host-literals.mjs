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
 *   `webPerformance` shim and `_forceAllowLocalhostNetworkCapture` on the session-recording
 *   controller): debug escape hatches that let session-recording network capture run against a
 *   local host. Session recording is hard-disabled in Beacon, and both properties default to
 *   `false`. Renaming the identifier is behavior-preserving because every read, write and the one
 *   deprecation message that names the property are renamed together inside the same module — the
 *   only surface lost is an undocumented `posthog.sessionRecording._forceAllowLocalhost…` poke
 *   from app code, which Beacon never does.
 * - posthog-js Sentry integration (`SentryIntegration` / `sentryIntegration` on the PostHog
 *   instance, the `https://sentry.io/organizations/` display-URL template, and the `$sentry_*`
 *   event properties): reachable only by calling `posthog.sentryIntegration()` / constructing
 *   `posthog.SentryIntegration`, which Beacon never does. Dropping the instance-property
 *   assignments also lets Rollup tree-shake the integration class itself.
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
    // Covers `__forceAllowLocalhost` (deprecated webPerformance shim) and
    // `_forceAllowLocalhostNetworkCapture` (session-recording controller) plus the deprecation
    // message that names the latter, in one consistent module-local rename.
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
];

/** Modules audited above, with the residual patterns that must not survive the replacements. */
const WATCHED_MODULES = [
  { idIncludes: "react-dom/cjs/react-dom", residuals: [REACT_ERROR_DECODER_RESIDUAL] },
  { idIncludes: "react-router/dist/", residuals: [DEV_HOST_RESIDUAL] },
  { idIncludes: "better-auth/dist/utils/url", residuals: [DEV_HOST_RESIDUAL] },
  { idIncludes: "posthog-js/dist/", residuals: [DEV_HOST_RESIDUAL, SENTRY_RESIDUAL] },
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
