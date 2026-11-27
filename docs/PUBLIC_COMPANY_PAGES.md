# Public company information pages

Cellar Studio's company website is designed to be accurate before a flagship product or business direction has been selected. These pages are part of the `Cellar-Studio` repository and are deployed to Vercel and GitHub Pages through the existing static-site builders.

| Public route | Source | Purpose |
| --- | --- | --- |
| `/about.html` | `deploy/pages/about.html` | Studio mission, principles and publicly documented core roles |
| `/licenses.html` | `deploy/pages/licenses.html` | MIT license text and limits on what it covers |
| `/certifications.html` | `deploy/pages/certifications.html` | Transparent record of company-level certification status |
| `/privacy.html` | `deploy/pages/privacy.html` | What the informational website currently processes and where other providers are involved |
| `/terms.html` | `deploy/pages/terms.html` | Site use and information notices; not a customer contract |
| `/policies.html` | `deploy/pages/policies.html` | Public working principles for accessibility, engineering and collaboration |
| `/cookie-policy.html` | `deploy/pages/cookie-policy.html` | Cookie and local-storage inventory; optional embed preference controls |
| `/refund-policy.html` | `deploy/pages/refund-policy.html` | Current no-sales/no-checkout status and future refund terms notice |
| `/business.html` | `deploy/pages/business.html` | Verified public identity vs unpublished registration/address/tax/contact information |
| `/contact.html` | `deploy/pages/contact.html` | Accessible **local-only** enquiry draft builder with optional identity fields, explicit consent and copy/clear actions |

They share `deploy/pages/company-pages.css` and `company-pages.js` for branding, dark/light mode compatibility, mobile navigation, focus states, and reduced-motion behavior. The global `theme-system.css` and `theme-system.js` are added during builds.

The shared `deploy/pages/cookie-consent.js` and `.css` are injected into each static HTML page. The cookie banner offers Essential only and Allow embeds choices; the Privacy settings button in the footer or Cookie Policy opens a keyboard-accessible settings dialog. Storage is `cellar-privacy-preferences` in localStorage. The theme system uses `cellar-studio-theme`. The consent module only loads future `data-consent-embed` HTTPS iframes after explicit opt-in, and none are presently in the page source. **This setting does not block Vercel or Google Fonts.** No advertising/analytics scripts are installed by this module. Audit third-party resources before adding them.

`deploy/pages/enquiry-form.js` validates the local enquiry draft, requires an informed consent checkbox, copies it with the browser clipboard API, and shows a selectable fallback when clipboard permissions are denied. **No endpoint, form submission, or business inbox exists; never label the action "Send" or imply that Cellar Studio received the draft.** Never commit visitors' drafts, emails or names to the repository.

The multi-column footer is maintained in one source file, `deploy/site-footer.html`, with styles in `deploy/pages/studio-footer.css`. Pages that contain `<!-- STUDIO_FOOTER -->` receive this shared HTML during `deploy/theme-inject.mjs`. The footer uses Cellar Studio's actual internal pages rather than copying React's links or adding unverified social accounts. To add a footer link to every relevant public page, edit the template once.

## What the website currently claims

- The root repository's `LICENSE` is MIT, with copyright held as `2026 Cellar contributors`.
- The publicly documented core governance names Suryandu Ganguly as founder/platform lead and Gunjan Roy as core engineering lead. See [`CORE_GOVERNANCE.md`](CORE_GOVERNANCE.md).
- Cellar Studio has **not published verified company-level certifications**. Individual qualifications, events, awards and courses must not be presented as a company certification.
- The exact first product, incorporation status, and corporate officer appointments are **not** announced on these pages.

## Updating public claims safely

1. **Company roles:** Verify and get approval for the public role, then update `about.html` and its source in `CORE_GOVERNANCE.md`. Do not expose private planning or access rules.
2. **License changes:** Check contributor rights and existing obligations. Update the root `LICENSE` through its own reviewed change, then match the full text on `licenses.html`. Do not assume other repositories or third-party assets have the same terms.
3. **New certifications:** Require issuer, exact credential name, covered entity/scope, certificate identifier, issue date, expiry or renewal date, and an independently verifiable record. Only then add a credential card to `certifications.html`.
4. **Business registration:** Do not add registration numbers, trademark status, ISO badges, security audit claims or guaranteed compliance without reviewed documentation.
5. **Privacy and policies:** Re-review `/privacy.html`, `/terms.html` and `/policies.html` whenever forms, analytics, customer accounts, products or other data flows change. These are current-information notices, not a substitute for reviewed legal documents.
6. **Sales and legal identity:** Revisit `/refund-policy.html` before accepting money, and `/business.html` when official business name, entity, address, tax and contact details are verified and approved for publication. Do not invent legal details.
7. **Embedded media:** Document each provider, purpose and request data on `/cookie-policy.html` before introducing it. Gate optional iframes with `data-consent-embed`, `data-embed-title` and an HTTPS `data-embed-src`; retest withdrawal and fresh consent.
8. **Verify and deploy:** Run `node deploy/build-vercel.mjs && node deploy/theme.test.mjs`. Check theme switching, contrast, keyboard-only navigation, form errors, mobile menu, cookie preferences and browser storage before merging the PR.

This documentation is a content-maintenance guide, not legal advice. The company-level licensing page describes the current repository's text; individual software projects may have different or additional notices.
