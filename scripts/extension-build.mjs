/** Webflow CLI writes this before the build CLI moves it into bundle/<channel>/<recipient>/. */
export const WEBFLOW_EXTENSION_BUNDLE_FILENAME = "bundle.zip";

/**
 * @param {string} jsContents concatenated JS from dist/ or the archived zip
 * @param {{ version: string; recipient?: string; towerOrigin?: string; forbidden?: Array<{ value?: string; pattern?: RegExp; label: string }> }} expected
 *   `forbidden` entries are either a bare substring (`value`) or a `pattern` RegExp — the same
 *   marker shape scripts/build-cli.mjs's matchForbiddenMarker consumes.
 */
export function assertBundleOutputMatchesBuild(jsContents, expected) {
  for (const { value, pattern, label } of expected.forbidden ?? []) {
    const hit = pattern ? pattern.test(jsContents) : typeof value === "string" && jsContents.includes(value);
    if (hit) {
      throw new Error(
        `Build output contains ${label} — a local dev value leaked into a release bundle. ` +
          "Check .env/.env.local overrides and the channel env in build-cli.mjs."
      );
    }
  }
  if (!jsContents.includes(expected.version)) {
    throw new Error(
      `Build output does not contain version "${expected.version}". The Vite build may be stale or misconfigured.`
    );
  }
  if (expected.recipient && !jsContents.includes(expected.recipient)) {
    throw new Error(
      `Build output does not contain recipient "${expected.recipient}". Check VITE_BUNDLE_RECIPIENT is passed into the production build.`
    );
  }
  if (expected.towerOrigin && !jsContents.includes(expected.towerOrigin)) {
    throw new Error(
      `Build output does not contain Tower origin "${expected.towerOrigin}". Check __BEACON_TOWER_ORIGIN__ in vite.config.ts.`
    );
  }
}
