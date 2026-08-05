/**
 * Compiles development-host literals (`localhost` / `127.0.0.1`) out of vendor code bundled into
 * Webflow Designer Extension builds. Marketplace review (round 4, 2026-08) flags dev endpoints in
 * public bundles; every replacement below targets a code path that is dead inside the extension
 * iframe, so runtime behavior is unchanged:
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
 *
 * After the targeted replacements, any watched vendor module that still contains a dev-host
 * literal fails the build — a vendor upgrade that moves or adds such a string must be re-audited
 * here instead of silently shipping. `scripts/build-cli.mjs` re-verifies the final dist output.
 */

const DEV_HOST_PATTERN = /localhost|127\.0\.0\.1/;

const RULES = [
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
    name: "better-auth isLoopbackHost",
    idIncludes: "better-auth/dist/utils/url",
    find: 'return h === "localhost" || h.startsWith("localhost:") || h === "127.0.0.1" || h.startsWith("127.0.0.1:") || h === "[::1]" || h.startsWith("[::1]:") || h === "0.0.0.0" || h.startsWith("0.0.0.0:");',
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
];

/** Module-id fragments audited above; any residual dev-host literal in them fails the build. */
const WATCHED_ID_FRAGMENTS = ["react-router/dist/", "better-auth/dist/utils/url", "posthog-js/dist/"];

/**
 * @param {{ strict?: boolean }} [options] `strict` (release channels) fails the build on any
 * residual dev-host literal in a watched module; non-strict (development channel) only applies
 * the replacements, since vendor development chunks legitimately mention localhost in warnings.
 */
export function createStripDevHostLiteralsPlugin(options = {}) {
  const strict = options.strict !== false;
  return {
    name: "codalyn:strip-dev-host-literals",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      const watched = WATCHED_ID_FRAGMENTS.some((fragment) => id.includes(fragment));
      if (!watched) {
        return null;
      }

      let next = code;
      for (const rule of RULES) {
        if (!id.includes(rule.idIncludes)) {
          continue;
        }
        while (next.includes(rule.find)) {
          next = next.replace(rule.find, rule.replaceWith);
        }
      }

      if (strict && DEV_HOST_PATTERN.test(next)) {
        const index = next.search(DEV_HOST_PATTERN);
        const context = next.slice(Math.max(0, index - 80), index + 80);
        throw new Error(
          `[strip-dev-host-literals] Unhandled dev-host literal in ${id} — vendor code changed; ` +
            `re-audit and update scripts/vite-strip-dev-host-literals.mjs. Context: …${context}…`
        );
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
