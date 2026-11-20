# Mitarbeit an der Website (Lernbus und Lerngesellschaft)

Diese Anleitung gilt für alle, die über GitHub an dieser Website mitarbeiten,
insbesondere für Conny Brandes und ihre Claude-Sitzungen. Der Inhaber des
Repositorys ist Jonas Hertner.

Conny Brandes leitet den Lernbus und entscheidet selbst über dessen Inhalte.
Ihr Einverständnis genügt, um Lernbus-Änderungen direkt auf `main` zu
veröffentlichen. Eine Freigabe oder ein Pull Request von Jonas ist dafür nicht
nötig.

## Was hier liegt

Ein Eleventy-Projekt. Es erzeugt lerngesellschaft.ch. Die Adresse lernbus.ch
leitet auf https://lerngesellschaft.ch/lernbus/ weiter. Jeder Stand auf `main`
wird automatisch veröffentlicht (`.github/workflows/deploy.yml`).

## Arbeitsweise: direkt auf `main`, jeder Push ist sofort live

Änderungen werden direkt auf `main` committet. Etwa eine Minute nach dem Push
sind sie öffentlich, ohne weitere Prüfung. Deshalb:

1. Vor jeder Arbeit `git pull` ausführen. Auch Jonas und seine Werkzeuge
   arbeiten direkt auf `main`.
2. Nur die Dateien ändern, die für die gewünschte Änderung nötig sind.
3. Vor jedem Push bauen und prüfen (siehe unten) und die geänderten Seiten in
   der Vorschau ansehen. Schlägt eine Prüfung fehl, nicht pushen.
4. Vor dem Push Conny kurz zeigen, was sich ändert, und ihr Einverständnis
   abwarten. Ihr Einverständnis genügt, auch für grössere Umbauten, Tarife und
   die Texte des Kontaktformulars.
5. Klare Commit-Nachricht: was sich für Besucherinnen und Besucher ändert und
   auf welchen Seiten (Deutsch und Englisch).
6. Nach dem Push prüfen, ob der Workflow «deploy» erfolgreich war und die Seite
   live richtig aussieht. Bei einem Fehler den Commit mit `git revert`
   rückgängig machen und erneut pushen.
7. Nie mit Force pushen, keine Branches löschen und keine Einstellungen des
   Repositorys ändern.

## Wo die Lernbus-Inhalte stehen

- Startseite: `src/lernbus/index.html` (Deutsch) und `src/lernbus/en/index.html`
  (Englisch). Die meisten Texte stehen direkt in diesen beiden Dateien.
- Konzept: `src/lernbus/konzept/index.html` und `src/lernbus/en/konzept/`.
- Team: `src/lernbus/team/` und Inhalte in `src/_data/lernbusTeam.js`.
- Termine (Offene Türen): `src/_data/lernbusEvents.json` sowie die
  Kalenderdateien `src/lernbus/offene-tueren-2026.ics` und
  `src/lernbus/en/open-doors-2026.ics`.
- Elternstimmen: `src/_data/lernbusTestimonials.json`.
- Seitenbausteine: `src/_includes/lernbus-*.njk`.
- Gestaltung: die CSS-Dateien in `src/lernbus/`.
- Bilder: `src/lernbus/img/`. Bilder als WebP oder AVIF in vernünftiger Grösse
  ablegen (etwa 1600 px Breite, dazu eine kleine Fassung `-small`), mit
  aussagekräftigem Alternativtext.

Deutsch und Englisch immer gemeinsam nachführen. Deutsch in Schweizer
Standardsprache mit ss, ohne lange Gedankenstriche (Geviertstriche).

## Was Conny selbst freigibt

Alle Inhalte und die Gestaltung des Lernbus, insbesondere:

- Texte, Aufbau und Reihenfolge der Lernbus-Seiten (Startseite, Konzept, Team)
  auf Deutsch und Englisch.
- Termine, Bilder, Elternstimmen und die CSS-Dateien in `src/lernbus/`.
- Tarife und Preise: `src/_data/lernbusTariffGuide.json`,
  `src/_includes/lernbus-tariff-guide.njk` und Preisangaben in den Seiten.
- Texte und Felder des Kontaktformulars: `src/_data/lernbusContact.js` und
  `src/_includes/lernbus-contact.njk`.

## Nicht ändern (betrifft nicht die Lernbus-Inhalte)

Diese Dateien haben rechtliche oder technische Folgen ausserhalb der
Lernbus-Inhalte. Nicht ändern. Braucht es dort eine Änderung, Conny bitten,
dies mit Jonas zu klären.

- AGB: `src/lernbus/agb/`, `src/lernbus/en/terms/`, `src/_includes/agb.njk`.
- Impressum: `src/impressum/`, `src/imprint/`.
- Buchungs- und Versandcode: `src/lernbus/booking-config.json`, `booking.js`,
  `lesson-booking.js`, `contact.js`, `src/_data/lernbusBooking.js`.
- Alles ausserhalb des Lernbus: Vereinsseite `src/index.html`, `src/de/`,
  `src/en/`, `src/essays/` und die übrigen Ordner in `src/`.
- Technik: `.github/`, `eleventy.config.js`, `package.json`, `scripts/`.
- Schriften: `src/fonts/` und `src/lernbus/fonts/`. Lizenz von Lineto:
  Dateinamen nicht ändern, Schriften nicht kopieren oder weitergeben.

## Personendaten und Vertrauliches

- Keine Namen, Fotos oder Angaben von Kindern oder Eltern veröffentlichen,
  ausser Conny bestätigt, dass die Einwilligung der Eltern
  vorliegt.
- Elternstimmen nur in der freigegebenen Fassung.
- Keine internen Unterlagen (Verträge, Statuten, Steuer- oder Bankunterlagen,
  E-Mails) ins Repository legen. Das Repository ist öffentlich.
- Keine Passwörter, Tokens oder Zugangsdaten in Dateien schreiben.

## Bauen und prüfen

```sh
npm ci
npm run build
node scripts/check-lernbus.mjs
node --test scripts/check-lernbus-contact.mjs
```

`npm run dev` startet eine Vorschau unter http://localhost:8080/lernbus/.
Vor dem Push die geänderten Seiten in der Vorschau ansehen, auf
Desktop- und Handybreite.

`scripts/check-lernbus-copy.py` vergleicht den Wortlaut mit einem älteren
Referenzstand und schlägt auf dem aktuellen `main` bereits fehl. Es ist für
Textänderungen nicht massgebend.
