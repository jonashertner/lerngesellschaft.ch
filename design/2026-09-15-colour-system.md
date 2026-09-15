# Lernbus: Farben und Abschnittstrennung

## Gestaltungsregeln

- Indigo `#493f80` ist die Leitfarbe für Überschriften, Rollen, Nummern, Links und Bedienelemente auf hellen Flächen.
- Gelb `#f4db4b` trägt den Einstieg und die Buchungskarte. Auf dunklen Flächen hebt es Überschriften und Links hervor.
- Die Beiträge verwenden auf Wunsch ebenfalls die indigo-blaue Leitfarbe. Tarifnamen, Beschreibungen und Preise bleiben weiss.
- Papier `#fafafa` ist die Grundfläche. Ein gemeinsamer heller Indigoton `#f0edf6` gliedert Ablauf und FAQ. Kontakt und Qualität stehen auf Papier.
- Fliesstext verwendet `#29233e`, ergänzender Text `#655f73`. Die Fotos behalten ihre natürlichen Farben.

## Linien und Abstände

- Jeder direkte Abschnitt nach dem ersten in `main` besitzt genau eine obere Trennlinie: 2 px, `--section-rule` (`#b3afbc` auf hellen Flächen).
- Inhaltszeilen nutzen 1 px `--hairline` (`#d4d0da`). Rahmen und Bedienelemente behalten ihren stärkeren Indigo-Akzent.
- Auf dunklen Flächen gilt `--rule-inverse: rgba(250,250,250,.35)`. Für den Ausdruck wird dieser Wert auf eine sichtbare neutrale Linie zurückgesetzt.
- `--section-space` steuert die senkrechten Abschnittsabstände. Raum, Team, Buchung und Konzept-Einleitung folgen demselben System.
- Der letzte FAQ-Eintrag hat keine zusätzliche Abschlusslinie.

## Prüfung

- Eleventy-Build erfolgreich; alle sechs Lernbus-Routen, 158 lokale Verweise, Tarifabgleich und Kalender-Konfiguration geprüft.
- Abgleich mit freigegebenem deutschen und englischen Wortlaut erfolgreich; keine Textänderungen.
- Browserprüfung der deutschen Elternseite bei 859 px, der englischen Elternseite bei 1440 und 390 px sowie der englischen Konzeptseite bei 390 px. Keine horizontale Überbreite in diesen Ansichten.
- Abschnittsregeln und Abstände über berechnete Browser-Stile geprüft; Desktop-Ablauf/Buchung und mobiles Team/Konzept visuell geprüft.
- Der Eltern-Link im dunklen Anmeldeabschnitt der Konzeptseite ist jetzt gelb auf Indigo statt Indigo auf Indigo.
- Druckregeln und gemeinsame Team-Stile im Quelltext geprüft.
- Die öffentliche Browserkontrolle zeigte nach der Veröffentlichung zwischengespeicherte alte CSS-Dateien. Alle sechs aktiven Lernbus-Seiten erhalten deshalb automatisch aus dem jeweiligen CSS-Inhalt erzeugte Versionsparameter. So laden wiederkehrende Besucher nach einem Seiten-Reload die aktuelle Gestaltung.

Wichtige Textkontraste: Indigo/Papier beziehungsweise Papier/Indigo 8.72:1 und Indigo/Gelb 6.54:1. Das ist eine gezielte Farbprüfung, keine vollständige Barrierefreiheitsprüfung. Massstab: [W3C: Textkontrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Dekorative Trennlinien sind keine Bedienelemente; siehe [W3C: Nicht-Text-Kontrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
