import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pins the react-router patch (patches/react-router@7.14.2.patch). Unpatched, `ScrollRestoration`
 * emits an inline <script> via `dangerouslySetInnerHTML` for its framework/SSR restore path —
 * dead code in this SPA extension (the framework context is always null), but a live grep hit for
 * the one API name Marketplace reviewers search the bundle for (round-7 follow-up; the shipped
 * bundle.js must grep clean). The patch replaces that branch with `return null`; this test fails
 * if a dependency update drops the patch or reintroduces the emission.
 */
describe("react-router ScrollRestoration patch", () => {
  const require = createRequire(import.meta.url);
  const pkgRoot = path.dirname(require.resolve("react-router/package.json"));
  const distFiles = ["production", "development"].flatMap((channel) => {
    const dir = path.join(pkgRoot, "dist", channel);
    return readdirSync(dir)
      .filter((name) => name.endsWith(".js") || name.endsWith(".mjs"))
      .map((name) => path.join(dir, name));
  });

  it("carries no inline-script emission in any dist chunk's ScrollRestoration", () => {
    const carriers = distFiles.filter((file) =>
      readFileSync(file, "utf-8").includes('ScrollRestoration.displayName = "ScrollRestoration"')
    );
    expect(carriers.length).toBeGreaterThan(0);
    for (const file of carriers) {
      const source = readFileSync(file, "utf-8");
      const start = source.indexOf("function ScrollRestoration(");
      const end = source.indexOf("ScrollRestoration.displayName");
      expect(start, file).toBeGreaterThanOrEqual(0);
      const body = source.slice(start, end);
      // The emission's markers, not the API name — the patch comment mentions the API name itself.
      expect(body, file).not.toContain("__html");
      expect(body, file).not.toContain("restoreScroll");
      expect(body, file).not.toContain("createElement");
      expect(body, file).toContain("codalyn patch");
    }
  });
});
