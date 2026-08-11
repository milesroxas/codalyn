# Webflow Marketplace Review — Short Response (≤500 chars)

Condensed from [webflow-marketplace-compliance.md](webflow-marketplace-compliance.md) for the
submission form's character-limited response field. Body below is the submittable text (round 6).

---

All flags resolved: URL validation is https-only (http:/sms: rejected; the bundled editor lib is patched so those schemes are absent). The site runtime no longer touches iframe/embed sources. The auth one-time token moved from query string to URL fragment + POST body redemption (same-origin enforced). PostHog web-experiment code is excised from the bundle, not just disabled, and all privacy flags are pinned by tests. Runtime behavior + full endpoint list documented in the submission notes.

---

Previous round (kept for reference): Sentry removed from the bundle. Analytics is opt-in PostHog only — no autocapture, session recording, remote script loading, or persisted identifiers; remote-config toggles disabled so shipped behavior matches reviewed behavior. Localhost and placeholder-domain literals stripped by automated build gates. Popups verify origin plus a one-time nonce; redirects allowlisted. Site runtime ships via Webflow Assets and registered_scripts with pinned integrity hashes.
