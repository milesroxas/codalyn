# Webflow platform script rows on the test page (reference only)

Observed on `https://beacon-demo.webflow.io/blog/the-power-of-resilience` at the 2026-09-14 19:02:27 UTC
publish, unchanged after the embed-removal publish later that day. These are Webflow's own published-site
runtime files (the per-site `webflow.<site>.<hash>.js`, the `webflow.achunk.*` chunks it imports, GSAP +
ScrollTrigger rendered in the head for Interactions, jQuery). Beacon loads none of them.

**Decision (compliance-record R7b.16): do not pin them in the Preflight test package.** Paste them as
additional runtime files only if a reviewer explicitly asks. Every value can change when the site is
re-published, so re-run `node scripts/webflow-runtime-observe.mjs <page>` first and use its
"test-package rows" block instead of this table.

| Versioned runtime URL | How it loads | SHA-256 |
| --- | --- | --- |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.049b2302.3c18d83945b06000.js` | Loaded directly by the published page | `1c3c4ee4f9a82bc4255bd4f427597585726e0f303961dbb814e88a71e99d8573` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.22b66e874d42861f.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `7ca0ff5643a44cc9e6064ac82a22de24c906962a533224000861d68d0a59b451` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.2315c5f26dfe2bfd.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `fc2646e2b573d5b69ad0bfe6eaecf2adec05b93aecf4a3ac6422e4e0e0d1a62a` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.2aaad8b9b407aaec.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `3c665380a8ec94e99c5f4b50680adbb05315ca4b2aaf43de9644062dc29bc093` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.40144d8322818807.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `a2f6adedb14ae9f040ba4d7f091e63382fef1ea61da3f6800fd819e3bd60d9d1` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.43f4d187dbb3f1f5.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `38269af670afb18e457334353e5bfdcd4269462589083eab722c2f9ced71d53d` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.496d56dd8c063ec0.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `61f96d33eb412c13b56791c76ead48cfee4777b780be49e0c13d10ac2774dd3b` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.5959ac50b3c857f1.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `188fda5fe1c48401a0e1a9da355668fe960781435153380a08604dfe73f399da` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.64873797e35e968c.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `75302eb25693db697503c777280f40abc1d74ea83d441ab6c0ab073572399c7b` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.65add74e46fe5245.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `b7e97fd075138494c3b1dd2d042317b5f32dbd68d6a444bb195b90a11aff64f1` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.7459dc3931e7b310.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `21f3b439c6f4bbb6ccf317d26087641c94a6d8fa5b8c5a1ac4d3daa35350633a` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.ad6dcd2fc75b294c.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `08f4ec04403306a8551208e13a438a3e32694815c398e1fb71d1e5182935dee3` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.db80639074bc0296.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `0e1e5e2caf9990969a70b433524e579a793b5dd41ee9af05866b30760afe2c63` |
| `https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js` | Loaded directly by the published page | `92bb9a96476f983d212a2bc4f54c889039c1696dd4461d40a736860938570fbb` |
| `https://cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js` | Loaded directly by the published page | `b0b14d67b55b0c43c756ac0b106cfcb09d0879945f6ead64451065b0672916a2` |
| `https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=6a35c562c551e2eb11bc4f1c` | Loaded directly by the published page | `f7f6a5894f1d19ddad6fa392b2ece2c5e578cbf7da4ea805b6885eb6985b6e3d` |

Removed from the test page on 2026-09-14 (never flagged by Preflight): the demo template's 7
`cdn.jsdelivr.net` embeds (Mast accordion/modal/slider/inline-video/tabs/theme-toggle + Swiper 11). The
page loads exactly the 16 scripts above plus Beacon's runtime.
