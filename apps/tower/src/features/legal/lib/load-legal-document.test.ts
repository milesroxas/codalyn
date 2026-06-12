import { describe, expect, it } from "vitest";
import { LEGAL_SITE } from "@/features/legal/lib/legal-site";

describe("loadLegalDocument placeholders", () => {
  it("replaces known placeholders in markdown templates", async () => {
    const { loadLegalDocument } = await import("@/features/legal/lib/load-legal-document");
    const content = await loadLegalDocument("terms-of-service");

    expect(content).toContain(LEGAL_SITE.companyName);
    expect(content).toContain(LEGAL_SITE.contactEmail);
    expect(content).not.toContain("{{COMPANY_NAME}}");
    expect(content).not.toContain("{{CONTACT_EMAIL}}");
  });
});
