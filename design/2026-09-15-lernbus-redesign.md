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


## Neutral canvas review — 15 September 2026, following the beige question

Jonas asked to reassess the beige background against best design practices and overall colour coherence. The UI canvas is now neutral soft white #FAFAFA, replacing #FAF7EE; the existing collage retains its tactile cream-paper warmth. Supporting forest and violet tints are lighter (#EDF2EE and #F0EDF6), and decorative dividers now use violet-neutral #D4D0DA/#B3AFBC instead of yellow-grey. Saturated brand colours are unchanged. Shared body/form/selection ink is #29233E; selection is explicitly scoped to the current design. Browser theme colour is updated on all six pages. Text, dimensions and functionality are unchanged.

This is an aesthetic hierarchy judgement, not a claim that beige violates a standard. Primary references: [Material colour roles and hierarchy](https://codelabs.developers.google.com/customizing-material-color), [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum). Neutral surfaces support brand accents; saturated colours identify important areas and actions. Computed contrast for the twelve main text/neutral-surface pairs ranges from 5.28:1 to 14.33:1; seven brand/surface pairs also exceed 4.5:1. Dividers are decorative; controls retain strong violet boundaries. Build, six-route/146-reference and original-wording checks pass. No browser interaction QA was performed for this colour-only refinement.


## AGB integration and hero refinement — 15 September 2026

The task «AGBs für Lerngesellschaft entwerfen» passed on Jonas's explicit instruction to add the reviewed terms to the website footer. That original user instruction was verified using read_thread. Publication source: output/agb/AGB-Lerngesellschaft-2026-09-15.md. src/agb/index.md preserves the complete approved body verbatim; src/_includes/agb.njk and assets/legal.css provide the neutral, readable layout. No internal legal notes are published.

All 19 rendered HTML footers (including the new AGB page and English passthrough pages) and both print colophons link to /agb/. Existing legal/privacy links remain. Six-month statements on the DE/EN parent and concept pages, including concept metadata/fact strips, now distinguish a shared plan from an enforceable minimum: support can be ended at any time. Calendar and contact remain non-binding enquiries, with no new consent checkbox or booking submission.

Public deployment is isolated from the ongoing redesign: /Users/jonashertner/Dev/lerngesellschaft-agb-public, branch codex/agb-public, based on the previous public main 8efd046. Its narrow AGB change was pushed to main as 5d20b3304c4997151a8e99f12484242ed3fa19e8 via the existing GitHub Pages workflow. The complete redesign is still published only to the owner-private Sites preview. The same AGB changes were incorporated into the design branch; existing canonical/noindex corrections were retained when resolving concept metadata conflicts.

Validation: approved Markdown matches publication text exactly; one H1 and six clauses; 19 footer links plus two print links; desktop and 320-px AGB checks, no horizontal overflow. Lernbus's original-wording check now records the precise AGB deltas separately while preserving the immutable live baseline. All six route checks pass with 152 local references. The watch server had stale template output following the cherry-pick; it was stopped and the final build regenerated in a fresh process, then served statically for verification.

The hero hand is replaced by a violet paper bird; original image files are retained. See 2026-09-15-hero-edit.md for the exact Imagegen prompt and source/output paths. The web image is 1448 × 1086, with an 800 × 600 responsive derivative. No other image was regenerated.

Final visual corrections requested by Jonas: Fördertarif now uses the same white text and prices as the other tariff rows. Goal checkmarks use a centered SVG inside a circular yellow marker, with inherited alternating shapes and rotations removed. Browser computed styles confirm all six markers are centered and all tariff rows share the same colour; the six-route copy and 152-reference checks pass.

## Conny's biography and public release — 15 September 2026

Jonas supplied Conny Brandes's first-person biography and requested a Team section immediately before Ablauf, plus a photo placeholder. It is gently edited into three sections and six paragraphs, retaining her employment, training and family details. The DE/EN parent pages and existing team pages share one biography data source and profile include; the main navigation now links directly to the new section. The placeholder displays her initials and an explicit photo-to-follow label, without a fabricated portrait. The desktop portrait/biography columns stack below 48rem. The immutable live-copy baseline is retained, with the exact authorized additions recorded separately.

Jonas then explicitly instructed: «then publish to lernbus.ch etc». This authorizes publishing the complete reviewed Lernbus redesign, calendar and team content via the existing public GitHub Pages deployment, in addition to refreshing the private design preview. The association's other pages retain their content, with the shared privacy notice accurately describing the existing email form and booking provider.

## Editorial refinements and lesson booking — 15 September 2026

Jonas requested removing the repeated short cancellation phrases and the funded-places item from Zielgruppe, replacing Lernmentor with Mentor, and supplying shorter wording about pedagogical training and quality assurance. These changes apply to the DE/EN parent and concept pages and the team terminology. The AGB and the single explanation of the shared six-month plan in the FAQ remain as approved.

The prepared lesson-booking version changes the heading, iframe title, fallback email subject and weekly-times label. The 60-minute duration, weekly availability and existing anchor remain. Jonas's latest exact lead takes precedence: «Wählen Sie einen freien Termin für ein Gespräch.» The matching English lead is shortened too. Original references to an introductory conversation in the pedagogical process and tariff explanations remain.

The corresponding Microsoft Bookings service update requires renewed sign-in to jonashertner@lernbus.ch. After Jonas reported being signed in, the administrative tab returned to GoDaddy's empty login form. A second sign-in request remains pending. The independently completed editorial changes are being published; existing introductory-booking labels are temporarily retained so the site matches the actual service. The prepared label changes are in commit f0fb60c. Rename and re-describe the same Bookings service, retain its availability and duration, check any introduction-specific confirmation text, then apply the prepared labels and publish the completed lesson-booking change. No appointment was created, cancelled or modified.

Jonas reaffirmed: «Kalender zur Buchung einer Lektion (nicht Kennenlerngespräch).» The current prepared change also updates navigation to «Lektion buchen» and the lead to «Wählen Sie einen freien Termin für eine Lektion.» (with corresponding English wording), plus the already planned iframe, email-subject and weekly labels. This latest clarification supersedes the earlier conversation wording in the booking lead. Process and tariff references to an introductory conversation remain untouched. All six copy/route checks and 152 local references pass.

The public Bookings page was read again and still offers «Kennenlerngespräch Lernbus» with its introduction-specific description and a one-hour duration. The existing administrative Chrome tab again shows the GoDaddy Microsoft 365 login form; no working saved sign-in appeared when the account field was filled and the password field focused. An account-sign-in handoff was requested. Keep the prepared website change unpublished until the same Bookings service has been renamed to «Lektion Lernbus» and its introductory description/confirmation wording corrected. Preserve current 60-minute slots, staff choices and «Bemerkungen». No appointment was submitted or altered.

## Lesson request completed — 15 September 2026

After Jonas completed sign-in, Bookings administration became available. His latest wording supersedes the earlier proposed lesson labels: title «Lektion anfragen»; description «Wählen Sie den Termin, der Ihnen passt für die Lektion. Wir kontaktieren Sie dann für ein Kennenlerngespräch.» These exact values were saved on the existing service. Its one-hour duration, staff assignment and availability are retained; customer staff selection remains disabled and «Bemerkungen» remains optional. There was no introductory custom confirmation or reminder text to replace. No appointment was created or edited, and the pre-existing appointment still retains its original title.

The website heading, navigation, lead, iframe title and fallback email labels now match the lesson-request wording; the English site uses the corresponding translation. The week-times labels refer to lessons. Existing pedagogical references to a preliminary conversation remain appropriate. Six route/copy checks and 152 local-reference checks pass. The provider sign-in blocker is resolved and the synchronized change is ready for the already-authorized public release and private preview refresh.

## Quality section order — 15 September 2026

At Jonas's request, the existing quality-assurance section moves directly before the association section, after the FAQ. Both parent-page languages and their navigation use this order. The full section text, styles, calendar and contact form are unchanged. The immutable live-copy baseline remains untouched; the separately authorized expectation now permits precisely this section and navigation reorder.

The concurrent user-authorized task Lernbus-Fotos einbinden supplied the completed portrait and room-photo integration for the same release. The original JPEGs remain unchanged. Six responsive WebP derivatives serve Conny's portrait on four DE/EN parent/team routes and the two room images in a gallery before Team. Copy authorization only removes the former photo placeholders and adds the bilingual gallery heading. Photo-task validation covered dimensions, source-set assets, translated alt text and responsive CSS; the combined release retains the requested final quality-section order.

Jonas then requested a tighter portrait of Conny without arms in the photo task. Its ready, reviewed CSS frame keeps the original photographic assets and shows head and shoulders in a fixed 4:5 crop on all four parent/team routes. The shared template now reserves the frame and adjusts responsive image sizing. The photo task independently checked the source crop; the final build, copy and 160-reference checks pass.
