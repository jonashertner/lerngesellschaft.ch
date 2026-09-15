# Lernbus design and booking handoff

## Content contract — live-site wording plus explicitly requested changes

Keep the current text as on **lernbus.ch**, not the rewritten preview copy. Change design/layout and add the booking calendar only. This supersedes the earlier copy decisions and headline approximations in the conversation. All visible wording on the DE/EN parent, concept and team routes has been restored from the current public source. Live pages were fetched on 15 September and match Git 8efd046; parent HTML matches byte-for-byte, and the four reading pages match in visible text. The live German headline is «Individuelle Frühförderung, die Kinder stark macht.»

The original paragraphs, lists, seven-step Ablauf, seven FAQs and footer wording are retained. On 15 September Jonas additionally requested rounded tariffs, a clear distinction between calendar booking and the contact form, and a Team page with Conny Brandes as Leiterin (photo and description to come). These narrowly scoped changes now supplement the live-site copy contract; other wording remains unchanged. Forms open a draft in the visitor's email application. No contact or registration form has been submitted.

All six original HTML pages are now the content source. `detail.css` and `source-home.css` supply the visual treatment: poster typography, yellow/violet/teal spreads, editorial rows, responsive tables and original paper-collage assets. The former rewritten homepage template and its unused CSS/JS have been removed. `src/_data/lernbus.js` now contains only calendar labels. Existing route metadata corrections are preserved.

`design/lernbus-live-copy.json` records the verified source URLs, HTML hashes and body wording. `python3 scripts/check-lernbus-copy.py` compares every rendered word and punctuation mark against that baseline, excluding only the element marked `data-booking-addition` and applying the exact user-requested changes recorded separately in `design/lernbus-authorized-copy.json`. It passes for all six routes. Keep the live baseline immutable; any further authorized copy changes belong in the separate record.

## Booking status

Microsoft Bookings is configured under **jonashertner@lernbus.ch**, as Jonas explicitly requested on 15 September. A dedicated shared page, **Lernbus**, contains the service **Kennenlerngespräch Lernbus** (60 minutes, one attendee, no added buffer). Jonas is the administrator and the assigned staff member. Office calendar events affect his availability. **Conny Brandes, connybrandes@lernbus.ch, is added as Teammitglied**, following Jonas's explicit instruction. She is not yet assigned to the introduction service; whether she should take these appointments remains an optional allocation decision. General enquiries and customer replies remain **info@lernbus.ch**.

Public booking page (copied from the published Microsoft interface):
https://outlook.office.com/book/Lernbus@NETORGFT21038058.onmicrosoft.com/?ismsaljsauthenabled

Service-specific link:
https://outlook.office.com/book/Lernbus@NETORGFT21038058.onmicrosoft.com/s/MYWMeGFYBkWhy6GkOnw1Pg2?ismsaljsauthenabled

The shared scheduling mailbox is Lernbus@NETORGFT21038058.onmicrosoft.com. It is distinct from the calendar owner and reply address. No unrelated calendar or staff was modified.

Jonas supplied 21 weekly one-hour slots: Monday and Thursday at 08:15, 09:30, 10:45, 13:00, 14:15, 15:30 and 16:45; Wednesday at 08:45, 10:00, 11:15, 13:15, 14:30, 16:30 and 17:45. They are stored in booking-config.json and configured as seven separate one-hour service windows for each day. Other days are unavailable. The service uses 15-minute increments, and the existing gaps provide the breaks. Microsoft uses the Bern timezone, with business-local time enforced; site metadata uses Europe/Zurich. Default notice is 24 hours and the booking horizon is 365 days. No holiday exceptions were supplied.

The public page is available to anyone, uses the Lernbus violet (#493f80), CHF and German, and links to the existing website and privacy page. Name and email are required; phone and the custom text field «Bemerkungen» are optional. The default customer-notes prompt and customer-address field are hidden. The customer-facing staff picker is disabled, so scheduling goes straight to date and time selection. These changes were saved in Microsoft Bookings and verified in the live embedded calendar on 15 September; they require no website redeployment. Meeting location/format is described as agreed personally. Confirmation and calendar-invitation emails are enabled. No test appointment or cancellation has been submitted. Bookings sends its own staff membership notification when a member is added; no separate message was sent.

The calendar is enabled in the site configuration. Its direct link works without JavaScript. The official iframe loads only after the parent clicks and expands to the full width below the introduction. Recovery links remain above it. The provider owns live availability, reservation and confirmation; an iframe load never counts as a booking. The initial public page briefly returned Bad request before it began working. Embedding was refused on HTTP localhost, but the published HTTPS preview loaded the complete calendar and accepted time selection. Keep HTTPS when verifying it.

The optional logo upload did not complete: Chrome's extension requires Allow access to file URLs. The website itself retains the existing logo. No account/security settings were altered.

Official setup references: [service settings](https://learn.microsoft.com/en-us/microsoft-365/bookings/define-service-offerings?view=o365-worldwide), [public page settings](https://learn.microsoft.com/en-us/microsoft-365/bookings/customize-booking-page?view=o365-worldwide), [sharing and embedding](https://learn.microsoft.com/en-us/microsoft-365/bookings/share-shared-bookings-page?view=o365-worldwide).

## Verification and publication

Run `npm run build`, `node scripts/check-lernbus.mjs` and `python3 scripts/check-lernbus-copy.py`. The route check covers one H1, unique IDs, Swiss spelling, 146 local links/assets, exact tariff amounts and calendar URL/opt-in guards. The copy check covers all original visible wording, including forms and footer.

The restored DE/EN parent pages were checked at 320, 390, 768, 820, 1024, 1440 and 1920 px without horizontal overflow. The four restored reading pages were checked at 320 px without overflow. Phone and desktop compositions were visually reviewed. The provider calendar must be verified on HTTPS: Microsoft refuses its iframe on HTTP localhost.

Private review site: https://lernbus-design-review.voilajonas.chatgpt.site/lernbus/ . Manifest and sanitized deployment checkout: output/lernbus-site-preview/.openai/hosting.json. Preserve owner-only access. The source branch is codex/lernbus-design-booking. No main-branch/GitHub Pages or Lernbus domain deployment has been made.


## Latest refinement — 15 September 2026

- Tariffs use five-franc rounding: supported individual CHF 12.50 → CHF 10; solidarity pair per child CHF 87.50 → CHF 90. All others unchanged. Jonas authorized rounding either way; the choice was communicated as provisional after offering whole-franc and five-franc options. No separate answer had arrived when this preview was prepared.
- `#gespraech` contains appointment booking only. `#kontakt` is a separate general-question section with name, email and required message. No age, callback timing or programme checkboxes. The button accurately says «E-Mail vorbereiten» / «Prepare email» and opens a contact draft, with no appointment subject or automatic sending. Both areas and Team have navigation links.
- DE/EN Team pages now have one identified profile: Conny Brandes, Leiterin Lernbus / Head of Lernbus, connybrandes@lernbus.ch. A photo panel and biography line explicitly say they will follow; no qualifications, biography or portrait have been invented. The Bookings staff/service assignment was not modified.
- Palette uses sunflower #F4DB4B for the hero and booking, recognisable violet #493F80, deep forest #1E4843 for tariffs, paper #FAF7EE, restrained mint #E7EFEA and lavender #ECE8F3 secondary surfaces, and ink #29233E. Repeated yellow panels were reduced; navigation hover underlines now have strong contrast. Main text combinations checked at 5.7:1 or higher; violet on sunflower is 6.54:1. Colour tokens are centralised in detail.css.
- Build, route/assets, original-wording exceptions and mailto event-handler checks pass. No browser interaction QA was performed for this refinement. Existing responsive rules were extended for the separate contact layout and Conny profile; no test email or booking was sent.
