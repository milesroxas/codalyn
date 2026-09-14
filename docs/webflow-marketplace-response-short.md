# Webflow Marketplace Review — Short Response (≤500 chars)

Condensed from [webflow-marketplace-compliance.md](webflow-marketplace-compliance.md) for the
submission form's character-limited response field. Body below is the submittable text (round 7b,
2026-09-14 App Review Preflight third scan: single egress point / Lexical observer; the fourth scan on the 13:22 build returned only these two, one location each — compliance doc § R7b.13 — so this body is final). Keep the AVIF disclosure paragraph in the note too (listing copy is locked).

> Note: Marketplace listing copy is locked after the initial submission, so the external-service
> disclosure (opt-in image conversion via `tower.codalyn.app`) is carried in this submission-note
> changelog on every update — it must stay in the note for each resubmission.

---

Preflight: every request now leaves through one first-party egress call (extension-egress.ts) with an explicit destination policy — our Tower origin, or the Webflow-issued presigned asset-upload URL — mirrored by the shipped CSP; the release build fails on any second fetch site. The one MutationObserver is the rich-text editor's (Lexical) contenteditable sync inside our own panel: created on editor mount, scoped to its root, driven by typing. It never observes or writes the Designer canvas.

---

Earlier round-7b response (kept for reference, second-scan findings): Preflight findings resolved: the bundled auth client is gone — every request is a first-party fetch to our Tower origin, enforced by the shipped CSP. styles.css ships a version-3 source map from the same build. No http:// or ws:// URL remains (W3C namespaces aside); react-dom's innerHTML writes are compiled out; the site runtime renders sanitized nodes. The one MutationObserver left is the rich-text editor's contenteditable sync in our own iframe, driven by typing; it never touches the canvas.

---

Earlier round-7b response (kept for reference, postMessage/popup blockers): the extension opens no windows — every external destination (Tower, Webflow OAuth consent, policy pages) is a plain <a target="_blank" rel="noopener noreferrer">, and the release build fails on any window.open. Single-use handoff/OAuth-state URLs are minted before the click and refreshed when stale; the grant is detected by bounded, user-initiated polling. The only postMessage left is React's MessageChannel scheduler (no targetOrigin exists).

---

Earlier round-7 response (kept for reference, AVIF privacy flag): AVIF conversion is now opt-in, off by default. Selecting AVIF shows an in-context consent prompt disclosing the image is sent to our first-party Tower service (tower.codalyn.app) for conversion — in memory, never stored; revocable in Settings → Privacy. A persistent disclosure shows while AVIF is active. A hard guard at the single network call site refuses AVIF without consent, so no path (previews, size estimates, saved presets) sends image bytes unconsented. WebP stays fully in-Designer.

---

Earlier round-7 response (kept for reference, popup + telemetry flags): CSP is now enforced via meta tag in both shipped documents: connect-src allowlists only our Tower backend, https://us.i.posthog.com (sole telemetry processor; strictly opt-in), and Webflow's presigned upload hosts; the popout is connect-src 'none'; tests pin every directive and the build fails if the CSP is absent. Auth popups require opener access (gesture-gated blank-window open, token returned via postMessage); destinations allowlisted with exact origin+source checks, now unit-tested.

---

Earlier round-7 response (kept for reference, DOM-manipulation flag): The compare popout's hand-written script is deleted; quality-compare.js is now compiler output. The page is a second Vite entry rendered by React — the extension's own framework/state layer. All flagged patterns (getElementById, setProperty, setAttribute, classList, textContent, img.src) are gone; the UI is declarative JSX driven by React state. Opener origin+source trust checks, typed message validation, blob-URL revocation, and the no-inline-script CSP posture are preserved and tested.

---

Previous round (kept for reference, round 6): All flags resolved: URL validation is https-only (http:/sms: rejected; the bundled editor lib is patched so those schemes are absent). The site runtime no longer touches iframe/embed sources. The auth one-time token moved from query string to URL fragment + POST body redemption (same-origin enforced). PostHog web-experiment code is excised from the bundle, not just disabled, and all privacy flags are pinned by tests. Runtime behavior + full endpoint list documented in the submission notes.
