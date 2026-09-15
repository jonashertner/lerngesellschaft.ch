# Lernbus: English editorial review

Jonas requested the highest-quality English version as part of the ongoing quality review. This release edits the three English Lernbus routes, the English Conny profile, calendar labels, contact status messages and the linked English legal-information page. It preserves the German programme content and existing commercial terms.

## Editorial decisions

- Natural British English, with Lernbus and Lerngesellschaft retained as names. The association is explained once as Lerngesellschaft (Learning Society).
- “Early learning support” covers the actual age range more clearly than the narrower British expression “early years”. The range remains age three through the third year of Swiss primary school, without substituting UK Year 3.
- Consistent “introductory meeting”, “one-to-one lessons / lessons in pairs” and “school semester”. “Lernkiste” is explained as a personal learning box.
- Tariffs: subsidised, reduced, full-cost and solidarity. All eight amounts, lesson duration and semester booking conditions remain unchanged.
- Replaced literal translation such as “learning gladly”, “Getting-to-know meeting”, “carry the full fee” and “gaps ... consolidated”. In the latter case, the revised English correctly strengthens the skills rather than the gaps.
- Conny's experience, qualifications, family details and first-person voice remain faithful to the supplied German biography. “Nursery practitioner” avoids implying an assistant role not specified in “Miterzieherin”.
- Contact success means the form service accepted the submission; it does not claim verified inbox delivery. Error messages preserve entered information. No live message or booking was sent.
- English links to the association use its current English route. Reciprocal language metadata identifies the German and English versions of the three Lernbus pages. Existing German terms are clearly labelled “Terms and conditions (German)”.

## Validation

An independent second review compared the revised English parent, team and concept content with the German source. It checked eligibility, statistical proportions, lesson duration, weekly frequency and semester policy. Two subtle translation issues were corrected: “alles wird festgehalten” means “everything is documented”, and “fester Ort” does not promise a permanent location.

Build, six-route/link/price checks, immutable-source wording checks and all 12 mocked contact tests passed. The source baseline remains unchanged; the authorisation record contains exact approved English text spans. Browser checks covered English main-page typography at 1280 and 390 CSS pixels, the fee table at 390, concept content at 320, and the team page at 818. No horizontal overflow was observed.

## Remaining English journey work

Microsoft Bookings still uses one shared service with German custom text, including its name, description, notes label and acknowledgement. The website translation does not translate provider-owned content. The upcoming calendar work must address this before claiming an entirely English booking journey. No guessed locale query or duplicate service has been deployed.

Microsoft documents a default language per service and page-level language settings, while its service and custom-question models expose single text fields, not per-locale translation maps. A separate English service in the same business is a possible approach, but it must first be checked for shared availability, identical closures, slot times and notification behaviour.

- https://learn.microsoft.com/en-us/microsoft-365/bookings/set-language-time-zones?view=o365-worldwide
- https://learn.microsoft.com/en-us/microsoft-365/bookings/define-service-offerings?view=o365-worldwide
- https://learn.microsoft.com/en-us/graph/api/resources/bookingservice?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/resources/bookingcustomquestion?view=graph-rest-1.0

The AGB remain in German, clearly labelled. A complete English contractual translation is not included in this editorial release. General site rhythm and the other previously identified quality work remain open.
