# Mitarbeit an der Website (Lernbus und Lerngesellschaft)

Diese Anleitung gilt für alle, die über GitHub an dieser Website mitarbeiten,
insbesondere für Conny Brandes und ihre Claude-Sitzungen. Der Inhaber des
Repositorys ist Jonas Hertner.

## Was hier liegt

Ein Eleventy-Projekt. Es erzeugt lerngesellschaft.ch. Die Adresse lernbus.ch
leitet auf https://lerngesellschaft.ch/lernbus/ weiter. Jeder Stand auf `main`
wird automatisch veröffentlicht (`.github/workflows/deploy.yml`).

## Arbeitsweise: immer über einen Pull Request

1. Für jede Änderung einen neuen Branch von `main` anlegen.
2. Nur die Dateien ändern, die für die gewünschte Änderung nötig sind.
3. Bauen und prüfen (siehe unten), dann einen Pull Request gegen `main` öffnen.
   Im Pull Request kurz beschreiben, was sich für Besucherinnen und Besucher
   ändert und auf welchen Seiten (Deutsch und Englisch).
4. Nie direkt auf `main` pushen, nie selbst mergen und keine Einstellungen des
   Repositorys ändern. Jonas prüft und veröffentlicht. Der Merge ist die
   Veröffentlichung.

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

## Nur mit ausdrücklicher Zustimmung von Jonas

Diese Bereiche haben rechtliche, finanzielle oder technische Folgen. Hier nur
ändern, wenn Jonas es im konkreten Fall ausdrücklich verlangt hat, und dies im
Pull Request vermerken:

- AGB: `src/lernbus/agb/`, `src/lernbus/en/terms/`, `src/_includes/agb.njk`.
- Tarife und Preise: `src/_data/lernbusTariffGuide.json`,
  `src/_includes/lernbus-tariff-guide.njk` und Preisangaben in den Seiten.
- Buchung und Kontaktformular: `src/lernbus/booking-config.json`,
  `booking.js`, `lesson-booking.js`, `contact.js`, `src/_data/lernbusBooking.js`,
  `src/_data/lernbusContact.js`.
- Impressum: `src/impressum/`, `src/imprint/`.
- Alles ausserhalb des Lernbus: Vereinsseite `src/index.html`, `src/de/`,
  `src/en/`, `src/essays/` und die übrigen Ordner in `src/`.
- Technik: `.github/`, `eleventy.config.js`, `package.json`, `scripts/`.
- Schriften: `src/fonts/` und `src/lernbus/fonts/`. Lizenz von Lineto:
  Dateinamen nicht ändern, Schriften nicht kopieren oder weitergeben.

## Personendaten und Vertrauliches

- Keine Namen, Fotos oder Angaben von Kindern oder Eltern veröffentlichen,
  ausser Jonas bestätigt, dass die Einwilligung vorliegt.
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
Vor dem Pull Request die geänderten Seiten in der Vorschau ansehen, auf
Desktop- und Handybreite.

`scripts/check-lernbus-copy.py` vergleicht den Wortlaut mit einem älteren
Referenzstand und schlägt auf dem aktuellen `main` bereits fehl. Es ist für
Textänderungen nicht massgebend.
