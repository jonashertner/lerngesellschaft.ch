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

## Lernbus (lerngesellschaft.ch/lernbus)

The Lernbus pages are plain, hand-written HTML in `src/lernbus/` and are
copied to the output as they are (Eleventy passthrough, no templating):

- `index.html` (DE, canonical), `en/index.html` (EN parallel composition)
- `team/index.html`, `team/en/index.html`
- `konzept/index.html`, `en/konzept/index.html` (long-form concept, noindex)
- `lernbus.css` (one stylesheet for the family), `lernbus.js` (menu, sticky
  action bar, route progress, the mailto form with a copy-text fallback)
- `img/logo.svg`, `img/logo-light.svg` (vectorised logo), `img/social-card*.png`
  (Open Graph images, 1200x630), favicons; `fonts/` (Bricolage Grotesque,
  Hanken Grotesk, self-hosted)

Illustrations (bus, route, Lernhaltestelle, Lernkiste, arms-up figure) are
inline SVG in the pages themselves, drawn in the logo's palette
(violet #493f80, teal #7dbeb9, yellow #efed99, chalk #fbfaf3).

Copy rules: Swiss orthography (ss, never ß), no em-dashes, guillemets,
Sie-form for parents, Du-form only in the «Für dich» box. The enquiry form
composes an e-mail to info@lernbus.ch in the visitor's own mail app; nothing
is stored on the site (see /impressum/).

## Deployment

Two GitHub Pages targets, fed by a single source repo. See
`.github/workflows/deploy.yml` (to be wired up when ready).

## Fonts

Self-hosted Bradford LL web fonts in `src/fonts/`. Filenames are not to be
changed (Lineto licence terms). See `src/fonts/LICENSE-NOTICE.txt`. Confirm
domain coverage with Lineto before serving from any host other than the
domains on the licence certificates.
