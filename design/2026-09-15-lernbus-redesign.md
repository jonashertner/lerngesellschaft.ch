# Lernbus redesign and booking handoff

The working branch is `codex/lernbus-design-booking`. Before implementation, the checkout was fast-forwarded from `727846f` to the actual published source at `8efd046`. This preserves the current 60-minute offer and the four contribution levels. No public GitHub Pages deployment has been triggered.

The design uses the existing Lernbus logo, violet/teal/yellow palette and self-hosted typefaces. A commissioned AI illustration of the learning box provides the main visual; it is labelled as an illustration and makes no claim to show a real room, child or session. The full-size WebP is about 124 KB; the mobile image is about 32 KB.

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
