/** Webflow CLI writes this before the build CLI moves it into bundle/<channel>/<recipient>/. */
export const WEBFLOW_EXTENSION_BUNDLE_FILENAME = "bundle.zip";

/**
 * @param {string} jsContents concatenated JS from dist/ or the archived zip
 * @param {{ version: string; recipient?: string; towerOrigin?: string }} expected
 */
export function assertBundleOutputMatchesBuild(jsContents, expected) {
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
