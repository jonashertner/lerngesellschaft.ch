# Lernbus: contact form, colour sequence and photographs

## Authorised scope

Jonas requested direct contact delivery to info@lernbus.ch, removal of the insecure-form warning, a consistent yellow/violet colour system, and professional, mutually consistent lighting for the two room photographs and Conny's supplied portrait crop. He selected Formspree by delegating provider choice and completed registration and email verification himself.

## Implementation

- DE and EN parent contact forms post to `https://formspree.io/f/maeyrgjk`. Formspree form name: **Lernbus Kontakt**. Account email **info@lernbus.ch** visibly VERIFIED on 15 September 2026; Email action visibly enabled with this address selected. Free plan, no purchase.
- HTTPS native POST fallback plus accessible asynchronous sending. Strict success parsing, field validation (including whitespace-only input), honeypot, timeout, duplicate-submit protection, and input preservation on error. Referrer sends only the origin cross-site for Formspree's spam checks. Formshield is enabled; CAPTCHA remains at its existing disabled setting.
- DE/EN privacy sections explain the provider, US processing and submission archive. Concept/Forscherbühne mail-client forms are described separately and remain unchanged.
- Full parent sequence: yellow hero; paper audience; violet why; paper approach; pale violet rooms; paper team; pale violet process; violet fees; paper booking; pale violet contact; paper FAQ; pale violet quality; yellow association; dark footer. Adjacent sections differ, with consistent 2px section rules. Tariff text remains white.
- Three photographs retouched with built-in Imagegen and reviewed both as full previews and in the page. This is AI-assisted photographic finishing: fine texture and tiny toy/book details can be reconstructed. The conservative second portrait candidate was selected. Original user JPEGs remain unchanged. Local master files and prompts: `output/2026-09-15-photo-retouching/retouch-record.json` (not part of the website).
- Responsive WebP exports: portrait 1200×932 / 600×466; each room 1536×1024 / 800×533. Explicit dimensions avoid layout movement. Content hashes version CSS, contact JS and photographs for returning visitors.

## Verification before publication

- Eleventy build successful.
- Six-route checks: 164 local references, tariff parity and booking configuration guards pass.
- Immutable wording comparison passes on all six routes, with only the explicitly authorised contact-copy changes.
- Twelve mocked contact tests pass; these do not send email.
- Browser review at 1280px desktop and 390px mobile: DE/EN contact layout, room gallery, portrait and quality/association transition. No horizontal overflow or failed image found in the checked views. All thirteen section surfaces and 2px rules verified from computed styles.
- Actual test-message permission requested; no live test email had been sent at this pre-publication checkpoint. Provider acceptance and inbox receipt must not be claimed from mocked tests.
- Further user request: booking acknowledgement must read exactly: “Wir haben Ihre Buchungsanfrage erhalten. Wir melden uns so rasch als möglich, um mit Ihnen ein Kennenlerngespräch zu vereinbaren.” External Bookings configuration is being handled by the deployment owner task; source is otherwise ready.
