# Webflow Marketplace Review — Short Response (≤500 chars)

Condensed from [webflow-marketplace-compliance.md](webflow-marketplace-compliance.md) for the
submission form's character-limited response field. Body below is the submittable text (round 7,
2026-08-12 popup + telemetry flags).

---

CSP is now enforced via meta tag in both shipped documents: connect-src allowlists only our Tower backend, https://us.i.posthog.com (sole telemetry processor; strictly opt-in), and Webflow's presigned upload hosts; the popout is connect-src 'none'; tests pin every directive and the build fails if the CSP is absent. Auth popups require opener access (gesture-gated blank-window open, token returned via postMessage); destinations allowlisted with exact origin+source checks, now unit-tested.

---

Earlier round-7 response (kept for reference, DOM-manipulation flag): The compare popout's hand-written script is deleted; quality-compare.js is now compiler output. The page is a second Vite entry rendered by React — the extension's own framework/state layer. All flagged patterns (getElementById, setProperty, setAttribute, classList, textContent, img.src) are gone; the UI is declarative JSX driven by React state. Opener origin+source trust checks, typed message validation, blob-URL revocation, and the no-inline-script CSP posture are preserved and tested.

---

Previous round (kept for reference, round 6): All flags resolved: URL validation is https-only (http:/sms: rejected; the bundled editor lib is patched so those schemes are absent). The site runtime no longer touches iframe/embed sources. The auth one-time token moved from query string to URL fragment + POST body redemption (same-origin enforced). PostHog web-experiment code is excised from the bundle, not just disabled, and all privacy flags are pinned by tests. Runtime behavior + full endpoint list documented in the submission notes.
