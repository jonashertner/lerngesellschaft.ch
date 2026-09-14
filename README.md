# lerngesellschaft.ch / learningsociety.ch

White-paper site set as a book on the web.
Bradford LL (Book + Italic) and Bradford Mono LL (Regular).

## Local development

```sh
npm install
npm run dev
```

Then open <http://localhost:8080/de/> or <http://localhost:8080/en/>.

## Build

```sh
npm run build
```

Output goes to `_site/`.

## Authoring

The web entry pages live in `src/de/index.md` and `src/en/index.md`; the
paper text itself lives in `src/_includes/paper-de.md` and
`src/_includes/paper-en.md`. Standard Markdown plus footnote syntax (`[^1]`)
is supported. Each footnote is rendered twice:

- as a sidenote in the right margin (screen)
- as a classical footnote at the page foot (print)

No author action required to map between the two.

`src/llms.njk` publishes a compact machine-readable orientation at
`/llms.txt`. `src/social-card.svg` is the link-preview artwork used by the
Open Graph and Twitter metadata.

## Deployment

Two GitHub Pages targets, fed by a single source repo. See
`.github/workflows/deploy.yml` (to be wired up when ready).

## Lernbus parent site

The German and English parent pages use `src/_includes/lernbus-home.njk` and
shared content in `src/_data/lernbus.js`. Styles and small interactive controls
live in `src/lernbus/home.css` and `home.js`. Run `npm run build` followed by
`node scripts/check-lernbus.mjs` to verify the generated routes and booking guards.

Public scheduling configuration is in `src/lernbus/booking-config.json`.
Microsoft Bookings uses jonashertner@lernbus.ch and the supplied 21 weekly
one-hour slots. Conny Brandes is a team member; public enquiries go to
info@lernbus.ch. The calendar loads on request and needs HTTPS for embedding.
See `design/2026-09-15-lernbus-redesign.md` for setup and verification details.

## Fonts

Self-hosted Bradford LL web fonts in `src/fonts/`. Filenames are not to be
changed (Lineto licence terms). See `src/fonts/LICENSE-NOTICE.txt`. Confirm
domain coverage with Lineto before serving from any host other than the
domains on the licence certificates.
