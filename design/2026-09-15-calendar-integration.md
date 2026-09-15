# Lernbus: Kalenderintegration, Schritt 3

Auftrag: Die gestalterische und sprachliche Integration der Kalenderbuchung verbessern. Ergänzend wies Jonas auf unterschiedliche Schriftgrössen im Ablauf hin; dort sind jetzt alle sieben Textgrössen und Nummern einheitlich.

## Website

- Eine zusammenhängende Kalenderfläche mit violettem Kopf, Dauer und Ort ersetzt den gelben Einstiegskasten mit separatem IFrame-Rahmen.
- Der bestehende Titel und Einleitungstext bleiben erhalten. Eine kurze Klarstellung unterscheidet die Anfrage von einer verbindlichen Anmeldung; Grundlage ist die bestehende AGB-Regelung zum Vertragsschluss.
- Deutsch und Englisch erhalten ihre jeweiligen, von Microsoft erzeugten Dienstlinks. Die Sprachfassung ist im HTML vorhanden und bleibt auch ohne JavaScript über den Direktlink erreichbar.
- Der Kalender wird weiterhin erst auf ausdrücklichen Klick geladen. Hinweise zum Laden verwechseln ein IFrame-Ereignis weder mit einer erfolgreichen Darstellung noch mit einer Buchung. Direktlink und E-Mail bleiben als Ersatzweg verfügbar.
- Der Hinweis zum Wechsel in den Oktober wird nur vor dem Startmonat angezeigt. Er ändert oder erfindet keine Verfügbarkeit.
- Alle bisherigen Abschnittstexte, Beiträge, Profiltexte und Elternstimmen bleiben erhalten.

## Microsoft Bookings

Am 15. September 2026 direkt in der angemeldeten Lernbus-Verwaltung geprüft und eingestellt:

- Bestehender deutscher Dienst: `Lektion anfragen`, 60 Minuten, ein Teilnehmer, kein Puffer, keine Onlinebesprechung, eigene Planungsrichtlinie.
- Englischer Dienst über die Anbieterfunktion «Dienst kopieren» erstellt: `Request a lesson`, Sprache `English (United Kingdom)`; englische Beschreibung und optionales Feld `Notes`. `Bemerkungen` im deutschen Dienst bleibt erhalten.
- Gemeinsame zugewiesene Person: Jonas Hertner. Die öffentliche Mitarbeiterauswahl bleibt in beiden Diensten ausgeschaltet; Conny bleibt als Mitarbeiterin im Unternehmen erfasst.
- 15-Minuten-Inkrement, 24 Stunden Mindestvorlauf, 365 Tage Vorlauf; alle sieben Einzelzeitfenster an Montag, Mittwoch und Donnerstag sowie die Sperre vom 15. September bis einschliesslich 11. Oktober 2026 wurden in der Kopie abgeglichen. Der erste verfügbare Montag zeigt in beiden Sprachfassungen dieselben sieben Startzeiten am 12. Oktober.
- Englischer Bestätigungszusatz: “We have received your lesson request. We will contact you as soon as possible to arrange an introductory meeting.” Bestehende Benachrichtigungsoptionen bleiben erhalten. Keine Nachricht und keine Buchung als Test abgesendet.
- Der zuvor leere AGB-Link, der öffentlich zur Startseite führte, zeigt jetzt auf `https://lerngesellschaft.ch/agb/`.
- Die Anbieter-Hervorhebungsfarbe ist bereits exakt `#493f80`. Das Logo ist noch nicht hochgeladen: Der Browser-Dateiupload meldete eine fehlende Berechtigung. Keine Browser-Sicherheitseinstellung geändert.

Die Standard-Schaltflächen «Buchen» / «Book» und die Standardbestätigungen kommen von Microsoft. Der Dienstname und der Zusatz verdeutlichen den Anfragecharakter; dieser Ablauf ist kein administrativer Genehmigungsprozess. Die AGB liegen weiterhin auf Deutsch vor.

## Quellen und Prüfung

- [Microsoft: Dienste definieren](https://learn.microsoft.com/en-us/microsoft-365/bookings/define-service-offerings?view=o365-worldwide): eigene Dienstsprache, Beschreibung, Mitarbeiterauswahl und Bestätigungszusätze.
- [Microsoft: Dienstressource](https://learn.microsoft.com/en-us/graph/api/resources/bookingservice?view=graph-rest-1.0): `languageTag`, `webUrl`, `staffMemberIds` und Dienstkonfiguration.
- [Microsoft: Benutzerdefinierte Fragen](https://learn.microsoft.com/en-us/microsoft-365/bookings/add-questions?view=o365-worldwide): Fragenkatalog mit Auswahl pro Dienst.
- [Microsoft: Buchungsseite teilen](https://learn.microsoft.com/en-us/microsoft-365/bookings/share-shared-bookings-page?view=o365-worldwide): Anbieter-Einbettungscode.
- [MDN: IFrame-Ereignisse](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#error_and_load_event_behavior): Ein `load`-Ereignis beweist keine erfolgreiche Darstellung; `error` ist kein verlässlicher Ersatzweg.

Build, sechs Routen, 160 lokale Verweise, Textabgleich und JavaScript-Syntax erfolgreich. Unabhängige Quellprüfung: korrekte sprachabhängige URLs, kein IFrame vor dem Klick, E-Mail-Ersatz bei deaktivierter Konfiguration. Im Browser sind alle sieben Ablauftexte 17px und alle sieben Nummern 25.6px. Der lokale HTTP-Ursprung blockiert auch den unveränderten offiziellen IFrame; die bisher veröffentlichte HTTPS-Seite stellt den Kalender dar. Abschliessende Prüfung der neuen Einbettung und Veröffentlichung wird im Projektlog festgehalten.
