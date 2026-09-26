# Issue draft for createsomethingtoday/webflow-app-preflight — page-loaded SRI predicate never sees a preload-scanned script tag

> Prepared 2026-09-26 (compliance record R8.24). **Not filed yet** — Miles files it (outward-facing). Repository:
> <https://github.com/createsomethingtoday/webflow-app-preflight>, read at commit `53705c5` (2026-09-08); production
> origin in `packages/webflow-app-review-runtime-template/src/production-origin.ts` is
> `https://webflow-app-review-preflight.webflow-inc.workers.dev`, so this is the deployed tool's source. Paste the
> section below the rule as the issue body. It names no customer, credential or private URL beyond our own public
> test site.

---

**Title:** runner: "Script integrity is missing or wrong" for every page-loaded script that the preload scanner requests before the parser inserts it

## Summary

`runner/src/index.ts` sets a pinned file's `domIntegrity` from one DOM snapshot only: the one `captureTrustedScripts` takes inside the `context.route` handler of that file's first network request (`requestBoundaryScripts`). If no `script[src]` element with that exact `src` exists at that instant, `domIntegrity` stays `null`, `evaluateRuntimeSecurity` reports `runtimeIntegrityMatched: false`, and the extension shows "Script integrity is missing or wrong" with the next step "Add the saved integrity value and crossorigin="anonymous" to each script tag".

Chromium's preload scanner issues the request for every `<script src>` that follows a parser-blocking script before the tree builder inserts those elements. On a published Webflow page the end of `<body>` is `jquery-3.5.1.min.js` (synchronous), `webflow.<site>.<hash>.js` (synchronous), then page and site custom code. A script registered through the Custom Code API and applied at page level is therefore always requested while the DOM holds none of these elements, and the predicate fails regardless of what the served tag says. The final-state capture (`installedState.scripts`, written to the `dom_snapshot` artifact) does contain the tag with the correct `integrity` and `crossorigin`, but it is never consulted.

Observed on our own test site across seven revisions of the tag (bytes, URL, SRI, attribute set, trailing newline, ASCII-only content) since 2026-09-14: "Loaded" and "Hash matched" pass, "SRI matched" fails every time. Same result for Webflow's own jQuery tag when it is pinned as a control.

## Reproduction

Minimal fixture (Node, no dependencies):

```js
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const runtime = 'document.body.setAttribute("data-ready", "");';
const integrity = `sha256-${createHash("sha256").update(runtime).digest("base64")}`;
const tag = `<script src="/runtime.js" integrity="${integrity}" crossorigin="anonymous"></script>`;
const filler = `<p>${"lorem ipsum ".repeat(60)}</p>\n`.repeat(40);

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/runtime.js") {
    res.writeHead(200, { "content-type": "application/javascript", "access-control-allow-origin": "*" });
    return res.end(runtime);
  }
  if (pathname === "/slow.js") {
    return setTimeout(() => { res.writeHead(200, { "content-type": "application/javascript" }); res.end("window.__slow = true;"); }, 400);
  }
  if (pathname === "/fast") { res.writeHead(200, { "content-type": "text/html" }); return res.end(`<!doctype html><body>${tag}</body>`); }
  if (pathname === "/blocked") { res.writeHead(200, { "content-type": "text/html" }); return res.end(`<!doctype html><body>${filler}<script src="/slow.js"></script>${tag}</body>`); }
  res.writeHead(404); res.end();
}).listen(4317, "127.0.0.1");
```

Pin `http://127.0.0.1:4317/runtime.js` (page-loaded) with the printed SRI and ready selector `[data-ready]`, then observe `/fast` and `/blocked`. With a port of `captureTrustedScripts` run inside the same route handler (Playwright 1.59.1, Chromium 1228), three runs each:

| Page | Element in DOM at first request | `domIntegrity` | Final DOM tag |
| --- | --- | --- | --- |
| `/fast` (pinned tag is the only script, the shape of every fixture in `runner/test/runner.test.ts`) | yes, 3/3 | the pinned SRI | same |
| `/blocked` (one synchronous script ahead of it) | **no, 3/3** — `document.readyState` is `loading`, the request initiator is `parser` | `null` | carries the pinned SRI |

On a real published Webflow page (`https://beacon-demo.webflow.io/blog/the-power-of-resilience`, 35 KB, five `<script src>` at the end of `<body>`), all five are requested while the DOM contains **zero** `script[src]` elements, 3/3 runs; the settled DOM carries `integrity` on jQuery, webflow.js and the page-level registered script.

## Expected

A page-loaded file whose served `<script>` tag carries the pinned `integrity` and `crossorigin="anonymous"` satisfies `runtimeIntegrityMatched`, independent of whether the parser or the preload scanner issued the request.

## Why the obvious fallback is not enough

Falling back to the settled DOM would re-open the two adversarial cases the tests pin: a page overriding `document.scripts`, and `onload="this.integrity='…'"` (the attribute is reflected, so it is in the settled DOM). Both are page-script mutations; neither can change the bytes the server sent.

## Proposed fix

For a request whose `Network.requestWillBeSent` initiator type is `parser` (the runner already subscribes to that event), read the tag's `integrity` and `crossorigin` from the **served document bytes** rather than from the live DOM: keep the navigation `Response` from `page.goto`, `await response.text()` once, and locate the `<script>` start tag whose resolved `src` equals the pin (resolve against the document URL exactly as `captureTrustedScripts` does). Page code cannot alter the response body, so the forgery tests keep passing: the `document.scripts` override and the `onload` mutation both leave the served tag without `integrity`, and `runtime.js?v=2` in the query-distinct test is absent from the served HTML, so it stays `null`. Script-initiated requests keep the current request-boundary snapshot.

A regression test in the existing `runServerFixture` idiom:

```ts
test('accepts a page-loaded pin that the preload scanner requests before the parser inserts it', async () => {
  const source = 'document.body.setAttribute("data-runtime-ready", "");';
  const digest = createHash('sha256').update(source).digest();
  const integrity = `sha256-${digest.toString('base64')}`;
  const { manifest, rejection } = await runServerFixture({
    routes: () =>
      new Map([
        ['/runtime-fixture', {
          contentType: 'text/html',
          body: `<!doctype html><body>${'<p>filler</p>'.repeat(400)}<script src="/slow.js"></script><script src="/runtime-v1.js" integrity="${integrity}" crossorigin="anonymous"></script></body>`
        }],
        ['/slow.js', { contentType: 'application/javascript', body: 'void 0;', delayMs: 400 }],
        ['/runtime-v1.js', { contentType: 'application/javascript', body: source }],
        ['/proxy', { contentType: 'application/json', status: 403, body: '{}' }]
      ]),
    buildContract: (origin) => loopbackContract(origin, [{ url: `${origin}/runtime-v1.js`, sha256: digest.toString('hex'), integrity }])
  });
  expect(rejection).toBeUndefined();
  const [artifact] = manifest?.runtimeArtifacts as Array<{ domIntegrity: string | null }>;
  expect(artifact?.domIntegrity).toBe(integrity);
}, 30_000);
```

(`delayMs` needs a one-line addition to the fixture server so `/slow.js` is answered late; that is what makes the preload scanner win the race deterministically.)

## Two smaller observations from the same read

1. `collectTrustedExecutionEvidence` adds every script *request* on a pinned file's host to `runtimeCreatedScripts` whether or not a pinned runtime initiated it (`if (initiatedByPinnedRuntime || isRuntimeHostScript) runtimeCreatedScripts.add(label)`). Webflow serves uploaded assets from `cdn.prod.website-files.com`, the same host as its own `webflow.<site>.<hash>.js`, its `achunk` imports and its GSAP copies, so a Custom Code API hosted script always drags Webflow's parser-inserted site runtime into "New script elements were created". Using the `initiatedByPinnedRuntime` test alone for that list (the `unreviewedRuntimeScripts` list can keep the host rule) would make the heading true again.
2. `boundedEvidenceSnippet` (`src/create-review.ts`) applies the finding's line-relative `col` to the multi-line snippet from `getContextualSnippet` (which starts three lines earlier), so on a minified bundle the 500-character excerpt opens thousands of characters before the match. Passing `col + (offset of the match line inside the snippet)`, or the match index within the snippet, fixes the display.

---

## Our evidence, for the reviewer thread (not part of the issue)

- `node scripts/webflow-runtime-sri-replica.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience` — exit 1, 3/3 runs, pinned element absent at request time; every row printed. The same script with `--pin` on Webflow's jQuery URL shows the same for Webflow's own tag.
- `node scripts/webflow-runtime-pin.mjs <page> --expect-*` — exit 0 against the saved package (URL, SHA-256, SRI, DOM attribute, CORS, source map).
- Compliance record R8.24; falsified-cause table in [sri-item-investigation.md](sri-item-investigation.md).
