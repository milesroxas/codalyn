# Uninstalling Beacon and removing everything it added

Beacon only ever adds two kinds of things to your site, and both can be removed.

## What Beacon adds to a site

1. **A page-level footer script** (the CMS Slots runtime) on pages where you clicked
   **Install** or **Sync** in the CMS Slots panel. It is registered through Webflow's official
   Custom Code API with a subresource-integrity hash and applied with marker attributes so
   Beacon can find and remove exactly what it added.
2. **Hosted script assets** named `codalyn-beacon-runtime-<hash>.js` (plus a 1×1
   `codalyn-beacon-publish-placeholder.png` used for conditional-visibility seeding), stored in
   your site's Assets.

Beacon never adds site-level custom code, and the runtime it installs makes no network calls
from your published site.

## Recommended: remove from inside Beacon (automatic)

1. Open the page in the Webflow Designer and open Beacon's **CMS Slots** panel.
2. Delete the slot lists on the page. When you remove the last one, Beacon offers to uninstall
   the page runtime — accept it.
3. Beacon then removes the footer script entry from the page's custom code and deletes any
   `codalyn-beacon-runtime-*.js` assets no longer referenced by other pages.
4. Publish the site so the removal reaches the live site.

Repeat for each page where CMS Slots was installed.

## Manual removal (if you removed the App from your workspace first)

Removing the App from your Webflow workspace revokes its access but cannot run the cleanup
above — Webflow does not execute extension code on uninstall. If you removed the App before
running the in-app uninstall:

1. **Page settings → Custom code → Footer code**: delete the entry referencing
   `codalyn-beacon-runtime-…js` (it carries `data-` marker attributes naming Beacon/Codalyn).
   Do this for each page where you installed CMS Slots.
2. **Assets panel**: delete `codalyn-beacon-runtime-*.js` files and
   `codalyn-beacon-publish-placeholder.png`.
3. Publish the site.

## Disconnecting your data

- **Webflow authorization**: remove the Beacon/Codalyn app under Webflow → Apps &
  Integrations, and/or disconnect the site in Tower → Connection.
- **Tower account data** (settings sync, usage records): request deletion via account settings
  at https://tower.codalyn.app or email support@codalyn.app — see the
  [privacy policy](https://tower.codalyn.app/privacy).
- **Telemetry**: was collected only if you opted in; turn it off any time under Settings →
  Preferences → Privacy inside Beacon.
