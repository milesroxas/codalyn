/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { buildCmsSlotRuntimePropRow } from "@/features/cms-slots/model/cms-slot-composable-props";
import { sanitizeBeaconRichTextHtml } from "@/features/cms-slots/model/cms-slot-rich-text-html";

const ALIAS = new Map<string, string>();

describe("sanitizeBeaconRichTextHtml", () => {
  it("returns '' for missing/empty/empty-HTML input (no invented content)", () => {
    for (const raw of [null, undefined, "", "   ", "<p></p>", "<p><br></p>", "<p>&nbsp;</p>"]) {
      expect(sanitizeBeaconRichTextHtml(raw)).toBe("");
    }
  });

  it("keeps the full allowlist intact", () => {
    const html =
      "<h2>Title</h2><h3>Sub</h3><p><strong>b</strong><em>i</em><u>u</u></p><ul><li>x</li></ul><ol><li>y</li></ol><blockquote>q</blockquote>";
    const out = sanitizeBeaconRichTextHtml(html);
    for (const tag of ["<h2", "<h3", "<strong", "<em", "<u", "<ul", "<li", "<ol", "<blockquote"]) {
      expect(out).toContain(tag);
    }
  });

  it("strips <script>/<style> entirely (subtree dropped, not unwrapped)", () => {
    const out = sanitizeBeaconRichTextHtml("<p>ok</p><script>alert(1)</script><style>body{}</style>");
    expect(out).toContain("ok");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("body{");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out.toLowerCase()).not.toContain("<style");
  });

  it("drops event handlers, inline style and class attributes", () => {
    const out = sanitizeBeaconRichTextHtml('<p style="color:red" class="x" onclick="evil()">t</p>');
    expect(out).toContain("t");
    expect(out).not.toContain("style");
    expect(out).not.toContain("class");
    expect(out).not.toContain("onclick");
  });

  it("removes <img onerror> (non-allowlisted in v1) but keeps surrounding text", () => {
    const out = sanitizeBeaconRichTextHtml('<p>before<img src=x onerror="evil()">after</p>');
    expect(out).toContain("before");
    expect(out).toContain("after");
    expect(out.toLowerCase()).not.toContain("<img");
    expect(out).not.toContain("onerror");
  });

  it("keeps https/mailto/tel links", () => {
    for (const href of ["https://a.com", "mailto:a@b.com", "tel:+15551234"]) {
      const out = sanitizeBeaconRichTextHtml(`<p><a href="${href}">l</a></p>`);
      expect(out).toContain("<a");
      expect(out).toContain(href);
      expect(out).toContain("l");
    }
  });

  it("drops http: and sms: links but preserves their text (https-only web scheme, Marketplace round 6)", () => {
    for (const href of ["http://a.com", "sms:+15551234"]) {
      const out = sanitizeBeaconRichTextHtml(`<p><a href="${href}">click</a></p>`);
      expect(out).toContain("click");
      expect(out.toLowerCase()).not.toContain("<a");
      expect(out).not.toContain(href);
    }
  });

  it("drops javascript:/data: links but preserves their text", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "vbscript:x"]) {
      const out = sanitizeBeaconRichTextHtml(`<p><a href="${href}">click</a></p>`);
      expect(out).toContain("click");
      expect(out.toLowerCase()).not.toContain("<a");
      expect(out).not.toContain(href);
    }
  });

  it("forces rel='noopener noreferrer' on target=_blank links", () => {
    const out = sanitizeBeaconRichTextHtml('<p><a href="https://a.com" target="_blank">l</a></p>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain("noopener");
    expect(out).toContain("noreferrer");
  });

  it("unwraps non-allowlisted elements, keeping allowlisted descendants", () => {
    const out = sanitizeBeaconRichTextHtml("<div><section><p>kept</p></section></div>");
    expect(out).toContain("<p");
    expect(out).toContain("kept");
    expect(out).not.toContain("<div");
    expect(out).not.toContain("<section");
  });

  it("does not throw on malformed/unbalanced HTML", () => {
    expect(() => sanitizeBeaconRichTextHtml("<p><strong>oops</p>")).not.toThrow();
    expect(() => sanitizeBeaconRichTextHtml("<a href=")).not.toThrow();
  });
});

describe("buildCmsSlotRuntimePropRow richText routing", () => {
  it("routes richText props through the sanitizer; passes other types verbatim", () => {
    const metas = [
      { propId: "body", label: "Body", valueType: "richText" },
      { propId: "name", label: "Name", valueType: "text" },
    ];
    const row = buildCmsSlotRuntimePropRow(
      { propValues: { body: "<p>ok</p><script>alert(1)</script>", name: "<p>literal</p>" } },
      metas,
      ALIAS
    );
    expect(row.body).toContain("ok");
    expect(row.body.toLowerCase()).not.toContain("<script");
    // Non-richText value is not sanitized — stored exactly as provided.
    expect(row.name).toBe("<p>literal</p>");
  });

  it("collapses empty-HTML richText to '' so conditional visibility hides it", () => {
    const metas = [{ propId: "body", label: "Body", valueType: "richText" }];
    expect(buildCmsSlotRuntimePropRow({ propValues: { body: "<p><br></p>" } }, metas, ALIAS)).toEqual({ body: "" });
  });
});
