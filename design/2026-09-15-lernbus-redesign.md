# Lernbus redesign and booking handoff

The working branch is `codex/lernbus-design-booking`. Before implementation, the checkout was fast-forwarded from `727846f` to the actual published source at `8efd046`. This preserves the current 60-minute offer and the four contribution levels. No public GitHub Pages deployment has been triggered.

The design uses the existing Lernbus logo, violet/teal/yellow palette and self-hosted typefaces. The second visual iteration uses oversized poster typography and original tactile collages made from paper shapes, blocks, a pencil and thread. The images are labelled as illustrations and make no claim to show a real room, child or session.

The DE/EN parent pages share one template and structured content. They now give parents the offer, an explicitly illustrative learning journey, three steps, the complete contribution table, an introductory-conversation entry point and native FAQ disclosures. Reading pages retain their substantive content with a more compact layout. Empty portrait cards were removed; actual team introductions remain an editorial dependency. All Lernbus contact paths use info@lernbus.ch. The concept pages lead into the same conversation route instead of presenting a mailto form as a sent request.

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

## Verification

Run `npm run build` and `node scripts/check-lernbus.mjs`. The checks cover generated internal links/fragments/assets, unique IDs, one H1 per page, Swiss spelling, tariff parity, no automatic iframe, readable story content without JavaScript and booking URL validation. Browser checks cover 320/390 px phone layouts and desktop, menu operation, the learning-story tabs, FAQs and the booking contact state. On 15 September, all seven Monday, Wednesday and Thursday start times were verified in the published parent calendar, with other weekdays unavailable. The embedded HTTPS calendar and time selection were also checked; email delivery, reservation and cancellation were not exercised. These are targeted checks, not a claim of a complete accessibility certification or measured field Core Web Vitals.

The current domain redirect chain also includes an HTTP hop; fix this in the domain forwarding settings when those controls are available. Real mentor names and approved portraits would add the most valuable remaining trust evidence.

Private design preview: https://lernbus-design-review.voilajonas.chatgpt.site/lernbus/ (owner-only). Preview source/hosting manifest: output/lernbus-site-preview/.openai/hosting.json. This is a separate review deployment and does not change GitHub Pages or the Lernbus domain.

## Expressive design iteration — 15 September

Jonas requested a more distinctive, less clean design while keeping the existing text largely intact. The visual direction is a Swiss learning atelier: large poster headlines, tactile original collage, coloured spreads, editorial offer rows, a learning-notebook interaction and staggered numbered steps. The concept and team pages share the palette and typography, with a two-column reading grid that stacks on phones. The only changes to structured parent-page copy are image descriptions and illustration labels; headings, substantive text, prices and booking settings remain unchanged.

Research references used for design principles, not copied assets:
- [Art UK's Superpower of Looking, Pentagram](https://www.pentagram.com/work/the-superpower-of-looking): curiosity made visible through framing and discovery.
- [Luzerner Theater, Studio Feixen](https://www.studiofeixen.ch/luzerner-theater/): Swiss poster scale, expressive alignment and disciplined practical information.
- [St Christopher School, Pentagram](https://www.pentagram.com/work/st-christopher-school): tactile arts and crafts warmth suitable for progressive early education.

Two original AI-generated raster assets were generated once each and converted to responsive WebP sources: discovery-collage (1448/800 px) and experiment-collage (1000/550 px). Generation prompts are in design/2026-09-15-collage-prompts.md. The browser selects size variants; the story illustration is lazy loaded. No stock child or fabricated team portrait is used.

This iteration was visually checked on phone, tablet and desktop. DOM bounds were checked across 320, 390, 768, 820, 1024, 1440 and 1920 px for German and across the corresponding phone/tablet/desktop range for English. No horizontal overflow remains in the parent pages. All four concept/team routes were checked at 320 px; long German reading headings were fixed to wrap within their columns. Menu open/close and Escape, story click/arrow-key selection, and weekly availability disclosure were exercised. Tariffs retain semantic table headers while stacking into labelled rows on small phones. All six route/link/configuration checks pass.

Private preview version 5 deployed successfully at https://lernbus-design-review.voilajonas.chatgpt.site/lernbus/?v=5. Preview source commit: 37202a93ec26782cbf35f63d2217bbf937e0af34. Site changes are committed on codex/lernbus-design-booking at 03895aa. The live HTTPS calendar loaded correctly in the new layout on desktop and a 390 px phone. Date/time selection, no customer staff picker, and the optional Bemerkungen field remain present as configured. No booking was submitted. Main text colour pairs tested at 5.49:1 or better, including body, secondary text and large coloured numbers.
