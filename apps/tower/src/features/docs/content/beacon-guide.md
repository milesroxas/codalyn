# Beacon Documentation

Beacon is a Webflow Designer Extension by Codalyn. It runs inside the Webflow Designer panel and
adds tools for image optimization and CMS-driven component content ("CMS Slots").

If anything here doesn't answer your question, use [Support](/support) or email
support@codalyn.app.

## Getting started

1. Install Beacon from the Webflow Marketplace, or add it to your workspace from your Webflow
   dashboard under **Apps & Integrations**.
2. Open a site in the Webflow Designer, press <kbd>E</kbd> or click the **Apps** icon in the left
   toolbar, and launch **Beacon**.
3. Beacon opens as a panel inside the Designer. The home screen lists the available features —
   pick one to begin.

Some features work immediately without an account ("guest mode"); others — CMS Slots, AVIF
encoding, settings sync, and billing — require a Codalyn account connected to your Webflow
workspace. Beacon walks you through connecting when a feature needs it.

## Image Editor

Crop, resize, and re-encode images without leaving the Designer.

- **Open an image**: select an image asset or upload one from the Image Editor screen.
- **Crop**: drag to frame the crop; use crop presets for common aspect ratios. Signed-in users
  can save their own presets, which sync across devices.
- **Export formats**:
  - **WebP** — encoded entirely inside the Designer on your machine. Nothing is uploaded.
  - **AVIF** — encoded by Codalyn's Tower service: the cropped image is sent over HTTPS,
    converted in memory, and returned. The image is never stored; see the
    [privacy policy](/privacy) for details.
- **Result**: download the optimized file, or add it to your site's assets to use on the canvas.

## CMS Slots

CMS Slots binds Webflow CMS content to component-based layouts, so structured collection data can
drive repeated elements on your pages.

### Concepts

- **Slot list** — a group of elements on a page that Beacon fills from a CMS collection.
- **Props** — the mapping between collection fields and element content (text, rich text, images,
  links, visibility).
- **Page runtime** — a small script Beacon installs into the page's footer custom code that
  applies your saved slot content on the published site. It is registered through Webflow's
  official Custom Code API with an integrity hash, and it makes no network calls from your
  published site.

### Workflow

1. Open **CMS Slots** from Beacon's home screen.
2. Create a slot list on the current page and choose the CMS collection it should read from.
3. In the composer, map collection fields to the tagged elements (text, rich text, images,
   links, conditional visibility).
4. Click **Install** (first time on a page) or **Sync** (after changes) to write the runtime and
   the latest content into the page's footer custom code.
5. **Publish the site** in Webflow so the changes reach the live site.

Saving in the composer and renaming or deleting slots re-syncs pages that already have the
runtime installed. Nothing is ever installed without an explicit Install or Sync action.

### What CMS Slots adds to your site

Exactly two kinds of things, both removable (see
[Uninstalling Beacon](#uninstalling-beacon-and-removing-everything-it-added)):

1. A page-level footer script entry on pages where you clicked Install or Sync.
2. Hosted script assets named `codalyn-beacon-runtime-<hash>.js` (plus a 1×1 placeholder image
   used for conditional-visibility seeding) in your site's Assets.

Beacon never adds site-level custom code.

## Accounts, plans, and billing

- **Account**: sign in from Beacon's Settings → Account, or at
  [tower.codalyn.app](https://tower.codalyn.app). Access is currently granted by invitation —
  use **Request access** in the app if you don't have one yet.
- **Workspace connection**: CMS Slots requires authorizing the app for your Webflow workspace.
  Beacon opens Webflow's standard OAuth authorization for this; you can revoke it any time from
  Webflow → Apps & Integrations.
- **Plans and billing**: manage your plan, payment method, and invoices from Beacon's Settings →
  Billing or at [tower.codalyn.app/billing](https://tower.codalyn.app/billing). Payments are
  processed by Stripe.
- **Settings sync**: signed-in users' export defaults, crop presets, and the page/collection
  references those presets use are stored with their Tower account so they follow you across
  devices.

## Privacy and telemetry

- Telemetry is **off by default and strictly opt-in**. On first run Beacon asks whether you want
  to share anonymous usage and error data; declining (or dismissing) keeps it off.
- You can change your choice any time in **Settings → Preferences → Privacy**, which also
  describes exactly what is collected.
- Details are in the [privacy policy](/privacy), section "Beacon Designer Extension."

## Uninstalling Beacon and removing everything it added

### Recommended: remove from inside Beacon (automatic)

1. Open the page in the Webflow Designer and open Beacon's **CMS Slots** panel.
2. Delete the slot lists on the page. When you remove the last one, Beacon offers to uninstall
   the page runtime — accept it.
3. Beacon removes the footer script entry and deletes any `codalyn-beacon-runtime-*.js` assets
   no longer referenced by other pages.
4. Publish the site so the removal reaches the live site.

Repeat for each page where CMS Slots was installed, then remove the app under Webflow → Apps &
Integrations.

### Manual removal (if you removed the app from your workspace first)

Removing the app from your Webflow workspace revokes its access but cannot run the cleanup above
— Webflow does not execute extension code on uninstall. In that case:

1. **Page settings → Custom code → Footer code**: delete the entry referencing
   `codalyn-beacon-runtime-…js` (it carries `data-` marker attributes naming Beacon/Codalyn).
   Do this for each page where you installed CMS Slots.
2. **Assets panel**: delete `codalyn-beacon-runtime-*.js` files and
   `codalyn-beacon-publish-placeholder.png`.
3. Publish the site.

### Disconnecting your data

- **Webflow authorization**: remove the Beacon/Codalyn app under Webflow → Apps & Integrations,
  and/or disconnect the site in Tower → Connection.
- **Tower account data** (settings sync, usage records): request deletion via account settings at
  [tower.codalyn.app](https://tower.codalyn.app) or email support@codalyn.app — see the
  [privacy policy](/privacy).
- **Telemetry**: was collected only if you opted in; turn it off any time under Settings →
  Preferences → Privacy inside Beacon.

## Troubleshooting

- **"Connect your Codalyn account" messages**: the feature you opened needs a signed-in account —
  use Settings → Account to sign in, or Request access if you don't have an invitation yet.
- **A popup didn't open** (sign-in or Webflow authorization): your browser may have blocked it.
  Allow popups for the Designer and click the button again — Beacon never retries popups on its
  own.
- **Published page doesn't show synced content**: click **Sync** in the CMS Slots panel, then
  publish the site in Webflow. The runtime only updates when you sync, and Webflow only serves
  it after a publish.
- **Something else**: contact us via [Support](/support) or the feedback form inside Beacon
  (Settings → Support) — include the page and steps that led to the problem.
