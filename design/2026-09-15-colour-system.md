# Lernbus: Farben und Abschnittstrennung

## Gestaltungsregeln

- Indigo `#493f80` ist die Leitfarbe für Überschriften, Rollen, Nummern, Links und Bedienelemente auf hellen Flächen.
- Gelb `#f4db4b` trägt Einstieg, Buchungskarte und Trägerschaft. Auf Indigo hebt es zentrale Aussagen und primäre Aktionen hervor.
- Die bestehenden hervorgehobenen Wörter im Haupttitel stehen gelb auf einer flachen Indigo-Fläche. Das ersetzt den kaum sichtbaren Unterschied zweier Violetttöne. Der Akzent kommt ohne Rahmen oder Schatten aus und gilt auch für die Team- und Konzeptseiten in beiden Sprachen. Mehrzeilige Phrasen behalten ihren natürlichen Umbruch; die Zeilenhöhe lässt Platz für die Farbfläche. Im Druck erscheint stattdessen eine Unterstreichung.
- Im Abschnitt «Warum» bleibt die Hauptaussage gelb; die Zwischenüberschriften sind weiss. Links und aufklappbare Zeiten in der Buchungskarte sind Indigo, ebenso die sekundäre Kontaktaktion. Dunkleres Indigo bleibt dem Hoverzustand primärer Schaltflächen vorbehalten.
- Die Beiträge verwenden auf Wunsch ebenfalls die indigo-blaue Leitfarbe. Tarifnamen, Beschreibungen und Preise bleiben weiss.
- Papier `#fafafa` ist die Grundfläche. Ein gemeinsamer heller Indigoton `#f0edf6` gliedert Raum, Ablauf, Kontakt und Qualität. Zielgruppe, Ansatz, Team, Buchung und FAQ stehen auf Papier. Dadurch unterscheiden sich angrenzende Abschnitte, ohne zusätzliche Akzentfarben einzuführen.
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

## Präzisierung des Haupttitels

Jonas beanstandete am 15. September die unklare Betonung von «stark» und beauftragte eine erneute Prüfung der ganzen Seite. Die bisher benachbarten Töne `#493f80` und `#38306a` unterschieden sich nur mit 1.28:1; die neue Umkehrung Gelb/Indigo erreicht 6.54:1. Indigo auf hellem Indigo erreicht 7.87:1, Fliesstext auf Papier 14.33:1. Die Farbnamen und Texte bleiben erhalten; der ebenfalls beauftragte Oktoberstart ist eine separate Textkorrektur.

Geprüft: Hauptseite DE bei 1440, 390 und 320 px, EN bei 320 px und Konzept DE bei 390 px; keine horizontale Überbreite. Alle 13 Abschnittsflächen und die 2-px-Trennlinien stimmen mit der Farbfolge überein. Bei 174 sichtbaren Textelementen der englischen Elternseite unterschritt kein berechnetes Farbpaar den jeweiligen WCAG-AA-Textkontrast; dies ersetzt keine vollständige Barrierefreiheitsprüfung. Sechs-Routen-Prüfung mit 164 Verweisen und unveränderlichem Textabgleich erfolgreich.
