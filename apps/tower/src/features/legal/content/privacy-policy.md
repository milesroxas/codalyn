This Privacy Policy describes how **{{COMPANY_NAME}}** ("**Codalyn**," "**we**," "**us**," or "**our**") collects, uses, discloses, and protects personal information when you use the {{PRODUCT_NAME}} application, related APIs, the Beacon extension (when connected to Tower), and our websites at [{{APP_SITE_URL}}]({{APP_SITE_URL}}) and [{{MARKETING_SITE_URL}}]({{MARKETING_SITE_URL}}) (collectively, the "**Service**").

This Policy applies to visitors, account holders, workspace members, and billing contacts. It does not apply to third-party websites or services that we do not control.

## 1. Information we collect

We collect information in three broad categories:

### Information you provide

- **Account data:** name, email address, password (stored in hashed form), profile details, and authentication session data.
- **Workspace data:** workspace names, membership, roles, invitations, and settings you configure.
- **Billing data:** subscription plan, billing status, and payment-related identifiers processed by **Stripe** (we do not store full payment card numbers).
- **Support and communications:** messages you send to us, including email to [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}).
- **Content you submit:** files, images, CMS-related data, and other Customer Content processed to provide the Service.

### Information collected automatically

- **Usage and device data:** pages viewed, features used, API usage counts, IP address, browser type, operating system, referral URLs, and timestamps.
- **Log and diagnostic data:** server logs, error reports, and performance data collected through **Sentry** and similar tools.
- **Analytics data:** product analytics events collected through **PostHog** when enabled, used to understand feature adoption and improve the Service.
- **Cookies and similar technologies:** session cookies required for authentication and security, and optional analytics cookies as described below.

### Beacon Designer Extension (inside Webflow)

The Beacon extension runs inside the Webflow Designer and handles data as follows:

- **Optional telemetry (opt-in only):** the extension sends no analytics or error data unless you enable sharing in the extension (first-run prompt or Settings → Privacy). When enabled, exactly the following is collected and processed by **PostHog** on our behalf: error reports (exception message and stack trace), feature-usage events you trigger (for example submitting feedback), app version, build channel and build metadata, the current Webflow site (ID, name, short name) and workspace (ID, slug) used for grouping, and the basic browser and device details the PostHog library attaches to every event (browser and version, operating system, language, screen and viewport size). As with any network request, PostHog receives your IP address in transport; we disable GeoIP enrichment so it is not used to derive your location. Autocapture, session recording, pageview/pageleave capture, surveys, referrer capture, and GeoIP location enrichment are disabled, and no tracking identifiers are persisted to cookies or local storage. Telemetry never includes page content, design content, or images. You can withdraw consent at any time in Settings → Privacy.
- **Image optimization (AVIF):** AVIF conversion is off by default and requires your explicit opt-in (shown when you first select AVIF, revocable any time in Settings → Privacy). Once enabled, choosing the AVIF file type in the image editor sends the image being edited over HTTPS to our Tower service, where it is converted in memory and returned in the response. We do not store the image; we log only operational metadata about the request (account and workspace identifiers, format, quality, input/output sizes, dimensions, and duration). While the opt-in is off, no image ever leaves the Designer; choosing WebP keeps encoding entirely inside the Designer with no upload.
- **Settings sync (signed-in users):** when you are signed in to Tower, your Beacon preferences — export defaults, crop presets, and the Webflow page and CMS collection identifiers and names those presets reference — are stored with your Tower account so they follow you across devices. Support and feedback requests you submit from Beacon (topic, message, and reply email) are sent to Tower as described under "Support and communications."
- The extension never reads or transmits your site's page or design content for analytics purposes.

### Information from third parties

- **Webflow:** when you connect a Webflow account, we receive OAuth tokens and Webflow site, CMS, asset, and related metadata needed to operate integrations.
- **Stripe:** payment status, customer identifiers, and subscription metadata.
- **Identity providers:** if we offer social or SSO sign-in in the future, profile information from those providers.

## 2. How we use information

We use personal information to:

- create and manage accounts and workspaces;
- authenticate users and maintain security;
- provide, operate, and improve the Service;
- process subscriptions and enforce usage limits;
- send transactional email (verification, invitations, billing notices) via providers such as **Resend**;
- respond to support requests;
- monitor performance, debug errors, and prevent abuse;
- comply with legal obligations; and
- with your consent where required, send product updates or marketing communications (you may opt out).

We do not sell your personal information.

## 3. Legal bases for processing (EEA, UK, and Switzerland)

Where applicable, we rely on:

- **Contract:** to provide the Service you request.
- **Legitimate interests:** to secure and improve the Service, prevent fraud, and understand usage, balanced against your rights.
- **Consent:** for optional analytics or marketing where required.
- **Legal obligation:** to comply with applicable law.

## 4. How we share information

We share personal information only as needed:

| Recipient | Purpose |
| --- | --- |
| **Service providers** | Hosting (e.g., Vercel), database (e.g., Neon), email (Resend), payments (Stripe), analytics (PostHog), error monitoring (Sentry), and file storage (Vercel Blob) — each processes data on our behalf under contractual safeguards. |
| **Webflow** | When you authorize a connection, as required by your use of Webflow integrations. |
| **Workspace members** | Information visible within a shared workspace according to your role and settings. |
| **Legal and safety** | When required by law, to protect rights and safety, or in connection with a merger or acquisition with notice where required. |

We require processors to handle personal information only for authorized purposes and in accordance with applicable data protection law.

## 5. Cookies and analytics

We use:

- **Strictly necessary cookies** for authentication, session management, and security. These cannot be disabled while using the signed-in Service.
- **Analytics cookies** (**PostHog**) to understand aggregate product usage. These load only after you grant consent to the "measurement" category through our consent banner.

### Consent management

Our websites show a consent banner (powered by **c15t**) before any non-essential cookies or analytics scripts run:

- Analytics does not load, set cookies, or transmit data until you accept the "measurement" category.
- Your choice is stored locally on your device (browser storage and a consent cookie); we do not maintain server-side consent records.
- You can review, change, or withdraw your consent at any time using the "Cookies" link in the site footer. Withdrawing consent stops analytics collection for subsequent activity.

You can also control cookies through browser settings. Disabling necessary cookies may limit Service functionality.

**Beacon extension telemetry** is governed by the in-extension consent controls described in Section 1 (not the website consent banner): it is off by default, starts only after you opt in, and can be turned off at any time in the extension's Settings → Privacy.

## 6. Data retention

We retain personal information for as long as your account is active or as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements. Retention periods vary by data type:

- **Account and workspace data:** retained while your account exists and for a reasonable period after deletion for backup and legal purposes.
- **Billing records:** retained as required for tax, accounting, and fraud prevention.
- **Logs and analytics:** retained for limited periods according to provider settings and operational needs.

When you delete your account or workspace, we delete or anonymize personal information within a reasonable timeframe, except where retention is required by law.

## 7. Security

We implement technical and organizational measures designed to protect personal information, including encryption in transit, access controls, and secure credential handling. No method of transmission or storage is completely secure. You are responsible for safeguarding your account credentials.

## 8. International transfers

We may process and store information in the United States and other countries where we or our service providers operate. Where required, we use appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms for cross-border transfers.

## 9. Your rights and choices

Depending on your location, you may have rights to:

- access, correct, or delete personal information;
- restrict or object to certain processing;
- data portability;
- withdraw consent where processing is consent-based; and
- lodge a complaint with a supervisory authority.

To exercise these rights, contact [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}). We may verify your identity before responding. Some requests may be limited by law or legitimate business needs (for example, retaining billing records).

**Marketing:** you may opt out of promotional email using the unsubscribe link in those messages.

**Account deletion:** account holders may request deletion through account settings or by contacting us.

## 10. California privacy notice (CCPA/CPRA)

If you are a California resident, you have additional rights including knowing categories of personal information collected, requesting deletion, and opting out of "sale" or "sharing" as defined by California law. We do not sell personal information. To submit a request, email [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}). We will not discriminate against you for exercising privacy rights.

## 11. Children's privacy

The Service is not directed to children under 16, and we do not knowingly collect personal information from children. If you believe a child has provided us information, contact us and we will delete it.

## 12. Changes to this Policy

We may update this Privacy Policy from time to time. We will post the updated Policy and revise the "Last updated" date. Material changes will be communicated through the Service or by email where appropriate. Continued use after changes become effective constitutes acceptance.

## 13. Contact us

**{{COMPANY_NAME}}**  
Privacy inquiries: [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}})

For questions about these Terms, see our [Terms of Service](/terms).

**Effective date:** {{EFFECTIVE_DATE}}
