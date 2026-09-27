# PISA 2025 · Schweiz: LinkedIn video

Two cuts of the same story for the Lerngesellschaft LinkedIn page, both
vertical (1080 × 1920, 30 fps, H.264), in German with Swiss data. They follow
The Economist's short "Are teenagers getting dumber?" (24 September 2026, 2:24).
Both are our own work: no Economist footage, script, charts, logo or fonts are
used.

1. **Magazine-style cut** (`video-economist.html`, `pisa-2025-lesen-economist-9x16.mp4`,
   101 s). Same visual language as the original: footage with lower-third
   captions, charts on grey paper with a red tag, blue-ink drawings on graph
   paper, a roundel at start and end. See the section below.
2. **Brand cut** (`video.html`, `pisa-2025-lesen-9x16.mp4`, 87 s), in the
   Lerngesellschaft colours and typefaces.

The rest of this section describes the brand cut. The imagery comes from our
own website: the Lernbus room, the learning-box illustration and the Rhine
panorama.

- `pisa-2025-lesen-9x16.mp4` is the upload file. It has no voice or music, so
  it works for LinkedIn's muted autoplay; all information is on screen, and a
  silent AAC track is included for player compatibility.
- `cover.png` is the thumbnail frame (the opening question).
- `video.html` holds the animation. Each frame is a pure function of time.
  Open it in a browser with `#t=20` appended to the URL to inspect a moment.
  Scene windows are in the `SCENES` table; inside a scene, `data-in` is
  seconds after the scene starts.
- `render.mjs` renders the frames in headless Chromium and encodes them with
  ffmpeg.

Essential content stays between y = 300 and y = 1620, so a centred 4:5 crop
(1080 × 1350) keeps it intact. Fonts are the landing page's Bricolage Grotesque
and Hanken Grotesk (SIL Open Font License, so video use is allowed). Colours
follow the landing page (`#241d2b`, `#f4d575`, paper white) plus a pink for
declines.

## Re-render

```sh
# needs Playwright (npm) and an ffmpeg build with libx264
node social/pisa-2025/render.mjs                           # full MP4
node social/pisa-2025/render.mjs --stills=3.5,20.5,41      # PNG stills in ./stills
node social/pisa-2025/render.mjs --stills=3.6 --nobar      # cover without progress bar
FFMPEG=/path/to/ffmpeg CHROMIUM=/path/to/chrome node social/pisa-2025/render.mjs
```

## Compared with The Economist's original

| The Economist (2:24, narrated, captions) | Our version (1:27, text on screen) |
|---|---|
| Question over archive footage | Question as typography |
| OECD averages falling; 2015 vs 2025 by country | Swiss maths strength; Swiss reading line; −22 ≈ one school year; Switzerland vs Germany and Austria |
| Gap between strong and weak students | Share of weak readers 19,9 % → 28,8 %; boys 34,2 % |
| Causes: Covid, absence, screens, reading for pleasure (US NAEP), "hasty readers" | Causes as the OECD states them: screen time, less reading for pleasure, hasty reading; AI use in Switzerland |
| What works: East Asia, England's reforms | *Not included yet; see "Open decision" below* |
| Close: test scores are not everything; worry for tomorrow | Close: reading starts long before 15; the Lernbus room; Lerngesellschaft end card |

**Open decision.** A Swiss "what works" act would most naturally use the
University of Basel's evaluation of early German support in Basel-Stadt. That
study was part of the Lernbus research section withdrawn on 25 September 2026
"pending further work", so it is left out until the team decides.

## On-screen text (Swiss Standard German)

| Time | Scene |
|---|---|
| 0–4.6 s | NEUE PISA-RESULTATE · **Werden unsere Jugendlichen dümmer?** · Was die Zahlen für die Schweiz zeigen. |
| 4.6–12 s | PISA misst nicht Intelligenz, sondern was 15-Jährige können. · Mathematik, Schweiz: **499** Punkte · OECD-Durchschnitt: 463 · Nur drei OECD-Länder schneiden besser ab. |
| 12–22.2 s | Doch beim Lesen geht es abwärts. Line chart 2015 492 · 2018 484 · 2022 483 · 2025 **470** («So tief wie noch nie») · OECD-Durchschnitt 2025: 461 |
| 22.2–30.6 s | **−22** Punkte beim Lesen seit 2015 · Nach einer Faustregel der OECD entsprechen rund 20 Punkte einem Schuljahr. · Bars 22 vs. 20 · Auch in Mathematik: minus 22 Punkte, von 521 auf 499. |
| 30.6–40.8 s | **Die Schweiz ist kein Einzelfall.** Dumbbell chart 2015 → 2025: Deutschland 509 → 465 (−44), Schweiz 492 → 470 (−22), Österreich 485 → 467 (−18) · Im OECD-Durchschnitt: minus 28 Punkte. |
| 40.8–53.2 s | Mehr als ein Viertel der 15-Jährigen liest zu schwach, um die Hauptaussage eines mittellangen Textes selbstständig zu erfassen. · Waffle chart: 2015 19,9 % → 2022 24,7 % → 2025 **28,8 %** · Bei den Knaben: 34,2 % |
| 53.2–65.2 s | **Warum?** Laut OECD gehen schwächere Leseleistungen einher mit: mehr Bildschirmzeit · weniger Lesen zum Vergnügen · mehr «hastigem Lesen» (Texte überfliegen, schnell falsch antworten). · Und: Jugendliche in der Schweiz nutzen KI für die Schule häufiger als im OECD-Durchschnitt. |
| 65.2–73.6 s | Yellow, with the learning-box illustration: **Lesen beginnt nicht mit 15.** Es beginnt mit Sprache: mit Gesprächen, Geschichten und Fragen. |
| 73.6–80 s | Slow pan across the Lernbus room: **Und mit einem Gegenüber, das zuhört.** · Lernbus, Münsterplatz 17, Basel |
| 80–87 s | Paper end card: Lerngesellschaft · Basel · Neugier begleiten. Möglichkeiten eröffnen. · lerngesellschaft.ch · Gemeinnütziger Verein … · Rhine panorama · sources |

## Claims and sources

The OECD, SBFI, EDK and IQS pages could not be opened from the build
environment (network policy). Every figure below was therefore cross-checked in
at least two independent reports of the primary sources. **Before posting,
check the figures marked ▲ against the primary source.**

| Claim | Source |
|---|---|
| Maths 499, OECD 463; only three OECD countries score higher. Science 501 (OECD 482). Reading 470 (OECD 461). | SBFI press release, 8.9.2026: <https://www.sbfi.admin.ch/de/newnsb/9EI2n5acP3WE>; EDK: <https://edk.ch/de/die-edk/news/mm20260908> |
| Reading 492 (2015) to 470 (2025); maths 521 to 499; 2025 is the lowest ever in Switzerland | OECD country note: <https://www.oecd.org/en/publications/pisa-2025-results-volume-i-country-notes_2d4ff9ea-en/switzerland_3aa7a464-en.html>; SRF: <https://www.srf.ch/news/schweiz/pisa-studie-2025-schweiz-bleibt-stark-verliert-aber-in-lesen-und-mathematik> |
| Reading 484 (2018), 483 (2022) | Earlier PISA cycles, e.g. NZZ on PISA 2022: <https://www.nzz.ch/schweiz/pisa-erhebung-schweizer-schueler-schneiden-in-mathematik-sehr-gut-beim-lesen-hapert-es-ld.1768827> |
| About 20 points ≈ one school year (OECD rule of thumb, varies by country) | OECD Education and Skills Today: <https://oecdedutoday.com/the-state-of-global-education-according-to-pisa/>; OECD PISA 2025 Results, Vol. I |
| Germany reading 509 (2015) to 465 (2025) | OECD country note Germany: <https://www.oecd.org/en/publications/pisa-2025-results-volume-i-country-notes_2d4ff9ea-en/germany_44abd042-en.html>; evido: <https://evido-magazin.de/artikel/pisa-2025-in-deutschland-zehn-zentrale-ergebnisse-im-ueberblick> |
| Austria reading 485 (2015) to 467 (2025), "18 Punkte weniger als vor zehn Jahren" | IQS: <https://www.iqs.gv.at/pisa-2025>; Schule.at: <https://www.schule.at/bildungsnews/detail/pisa-2025-lesen-und-mathe-schwaecher> |
| OECD average reading −28 points, 2015–2025 ("about one and a half years of learning"; maths −22 = "just over one year") | OECD press release, 8.9.2026: <https://www.oecd.org/en/about/news/press-releases/2026/09/pisa-2025-students-reading-and-mathematics-performance-declined-sharply-across-the-oecd.html>; School Rubric: <https://schoolrubric.org/pisa-2025-results-us-reading-decline/> |
| ▲ Weak readers (below level 2): 19.9 % (2015), 24.7 % (2022), 28.8 % (2025); boys 34.2 %; definition | SRF (above); 20 Minuten: <https://www.20min.ch/story/schweizer-jugendliche-pisa-studie-faehigkeiten-in-mathe-und-lesen-nehmen-ab-103629481>; national report: <https://www.pisa-schweiz.ch> |
| "More screen time and less reading for pleasure have gone hand in hand with weaker results … more hasty reading" (Mathias Cormann, OECD) | Reuters via U.S. News, 8.9.2026: <https://www.usnews.com/news/world/articles/2026-09-08/teen-reading-slumps-to-worst-this-century-due-to-surge-in-screen-time> |
| Young people in Switzerland use AI for school significantly more often than the OECD average | SBFI press release (above) |

Deliberately left out because they could not be verified to the same standard:
Swiss 2025 figures on reading for pleasure (the "over 50 %" in circulation may
be PISA 2018 data), and 45.9 % weak readers among students who speak only other
languages at home (single source).

Wording choices: the video says "Jugendliche in der Schweiz", as the SBFI does,
not "Schweizer Jugendliche". Causes are framed as the OECD frames them,
"gehen einher mit": a correlation, not a proven cause. The neighbour chart
shows reading only, where the 2015 and 2025 values for all three countries are
sourced; the OECD average appears as a change because its comparable 2015 value
was not verified.

## LinkedIn post (draft)

> Werden unsere Jugendlichen dümmer?
>
> Das fragte kürzlich The Economist. Wir haben die neuen PISA-Resultate für die Schweiz angeschaut.
>
> PISA misst nicht Intelligenz, sondern was 15-Jährige können. In Mathematik gehört die Schweiz zur Spitze: 499 Punkte, nur drei OECD-Länder schneiden besser ab.
>
> Beim Lesen dagegen geht es abwärts:
> – 470 Punkte, so tief wie noch nie in der Schweiz. Seit 2015 sind es 22 Punkte weniger – nach einer Faustregel der OECD rund ein Schuljahr.
> – Die Schweiz ist kein Einzelfall: Deutschland verlor im gleichen Zeitraum 44 Punkte, Österreich 18, der OECD-Durchschnitt 28.
> – 28,8 % der 15-Jährigen lesen zu schwach, um die Hauptaussage eines mittellangen Textes selbstständig zu erfassen (2015: 19,9 %). Bei den Knaben sind es 34,2 %.
>
> Laut OECD gehen schwächere Leseleistungen mit mehr Bildschirmzeit, weniger Lesen zum Vergnügen und «hastigem Lesen» einher.
>
> Lesen beginnt nicht mit 15. Es beginnt mit Sprache: mit Gesprächen, Geschichten und Fragen – und mit einem Gegenüber, das zuhört. Daran arbeiten wir in Basel.
>
> Quellen: OECD, PISA 2025 Results (8.9.2026); SBFI/EDK, Medienmitteilung vom 8.9.2026; IQS; SRF, 8.9.2026.
>
> #PISA2025 #Lesekompetenz #Bildung #Frühförderung #Basel

## Optional voiceover (about 80 s)

The video works muted. If someone records a voice later, this text follows the
scene timing:

> Werden unsere Jugendlichen dümmer? – Vorweg: PISA misst nicht Intelligenz, sondern was 15-Jährige können. Und in Mathematik gehört die Schweiz zur Spitze: 499 Punkte. Nur drei OECD-Länder schneiden besser ab.
>
> Doch beim Lesen geht es abwärts: von 492 Punkten im Jahr 2015 auf 470. So tief wie noch nie. Das sind 22 Punkte weniger – nach einer Faustregel der OECD rund ein Schuljahr.
>
> Die Schweiz ist damit kein Einzelfall. Deutschland verlor seit 2015 44 Punkte, Österreich 18, der OECD-Durchschnitt 28.
>
> Mehr als ein Viertel der 15-Jährigen liest inzwischen zu schwach, um die Hauptaussage eines mittellangen Textes zu erfassen. 2015 war es noch jeder Fünfte. Bei den Knaben ist es mehr als jeder Dritte.
>
> Warum? Laut OECD gehen schwächere Leseleistungen einher mit mehr Bildschirmzeit, weniger Lesen zum Vergnügen und hastigem Lesen. Und: Jugendliche in der Schweiz nutzen KI für die Schule häufiger als im OECD-Durchschnitt.
>
> Lesen beginnt aber nicht mit 15. Es beginnt mit Sprache – mit Gesprächen, Geschichten und Fragen. Und mit einem Gegenüber, das zuhört.
>
> Lerngesellschaft. Neugier begleiten. Möglichkeiten eröffnen.

## Magazine-style cut

`video-economist.html` rebuilds the story in the visual language of the
original. Everything is our own: the script, the charts and illustrations, and
the branding (a Lerngesellschaft roundel at the start, roundel and wordmark at
the end).

- **Footage**: the homepage film behind the title, graded like archive film
  and labelled «Symbolbild», then slow camera moves over the two Lernbus room
  photos. `render.mjs` extracts the film frames into `.cache/` (git-ignored).
- **Charts**: grey paper, red tag, bold title, gridlines, "Quelle" line, lines
  in navy, light blue and red; a dumbbell chart for the neighbours and a dot
  chart for maths.
- **Illustrations**: blue ink on graph paper, drawn stroke by stroke: an open
  book under a rain cloud (weak readers), a phone with notifications (screen
  time), a reader seen from above with a marked answer sheet (hasty readers), a
  chat prompt and an AI reply.
- **Captions**: the whole story runs as short lower-third captions, as in the
  original when it plays muted. The caption text is the voiceover script if
  someone records one later.
- **Fonts**: Source Serif 4, Libre Franklin, Roboto Condensed and Caveat, all
  SIL Open Font License (licences in `fonts/`), plus Bricolage for our wordmark.

`cover-economist.jpg` is the thumbnail for this cut. The film grain changes
every frame, so the renderer captures JPEG frames and encodes at CRF 25
(about 16 MB); at 100 % zoom that is indistinguishable from CRF 17 (97 MB).

```sh
node social/pisa-2025/render.mjs --page=video-economist.html
```

**Legal note.** A visual style is not protected by copyright, but copying a
distinctive get-up can create a risk of confusion under Art. 3 Abs. 1 lit. d
UWG. The cut therefore uses no Economist name, logo, fonts or footage, opens
and closes on our own mark, and the post names the Economist as the
inspiration.

**Homepage film.** The film looks AI-generated and its source is not
documented in the repository. It appears only as a labelled «Symbolbild».
Confirm the licence before posting; if it is AI-generated, «Symbolbild
(KI-generiert)» is the more transparent label.

### Captions (timecodes in seconds)

| Time | Scene | Caption |
|---|---|---|
| 0–3.6 | Film (archive grade), title «Werden unsere Jugendlichen dümmer?» | Werden unsere Jugendlichen dümmer? |
| 3.6–7.8 | Film | Die neue PISA-Studie der OECD · misst, was 15-Jährige können: |
| 7.8–23 | Chart: Schweiz, durchschnittliche PISA-Punkte 2015–2025 | in Mathematik, Naturwissenschaften und Lesen. · In der Schweiz sinken die Resultate · in Mathematik und beim Lesen. · Beim Lesen erreichen 15-Jährige · nur noch 470 Punkte – · so wenig wie nie zuvor. · Minus 22 Punkte seit 2015. · Laut OECD rund ein Schuljahr. |
| 23–26.2 | Lernbus room, picture books | Und im Vergleich mit den Nachbarn? |
| 26.2–37 | Dumbbell: Lesen 2015/2025, DE/CH/AT, OECD-Schnitt 461 | Das sind die Resultate von 2015. · Und so sehen sie 2025 aus. · Deutschland verliert 44 Punkte, · Österreich 18. · Im OECD-Durchschnitt: minus 28. |
| 37–41 | Lernbus room | Doch es geht nicht nur um Durchschnitte. · Immer mehr lesen zu schwach. |
| 41–53.4 | Graph paper: 19,9 % → 28,8 %, Knaben 34,2 % | 2015 konnten 19,9 Prozent · die Hauptaussage eines mittellangen Textes · nicht selbstständig erfassen. · 2025 sind es 28,8 Prozent. · Bei den Knaben · sogar 34,2 Prozent. |
| 53.4–61 | Graph paper: phone, "3,4 Stunden pro Werktag Freizeit am Bildschirm (OECD-Schnitt)" | Warum? · Laut OECD gehen schwächere Leseleistungen · mit mehr Bildschirmzeit · und weniger Lesen zum Vergnügen einher. |
| 61–70 | Graph paper: reader from above, "2018: 6,6 % · 2025: 11,4 % OECD-Schnitt", marked answer sheet | Im OECD-Schnitt hat sich zudem · der Anteil «hastiger Leser» fast verdoppelt. · Sie überfliegen Texte · und antworten schnell – · aber falsch. |
| 70–75 | Graph paper: «Fass mir den Text zusammen.», AI reply | Jugendliche in der Schweiz nutzen KI für die Schule · häufiger als im OECD-Durchschnitt. |
| 75–77.4 | Lernbus window | Es gibt auch gute Nachrichten: |
| 77.4–85 | Dot chart: Mathematik 2025, CH 499 · AT 477 · DE 464 · OECD 463 | In Mathematik bleibt die Schweiz stark. · Nur drei OECD-Länder schneiden besser ab. · Doch auch hier: minus 22 Punkte seit 2015. |
| 85–97.2 | Lernbus room, three shots | PISA-Punkte sagen nicht alles · über einen Menschen. · Aber Lesen beginnt nicht mit 15. · Es beginnt mit Sprache: · mit Gesprächen, Geschichten und Fragen – · und mit einem Gegenüber, das zuhört. |
| 97.2–101 | Roundel, Lerngesellschaft, lerngesellschaft.ch | — |

### Additional sources for this cut

| Claim | Source |
|---|---|
| Switzerland 2018: maths 515, reading 484, science 495 | LCH, 3.12.2019: <https://www.lch.ch/aktuell/detail/pisa-ergebnisse-2018/>; NZZ: <https://www.nzz.ch/schweiz/schweiz-pisa-ld.1525965> |
| Switzerland 2022: maths 508, reading 483, science 503 | EDK, 5.12.2023: <https://edk.ch/de/die-edk/news/mm05122023>; LCH: <https://www.lch.ch/aktuell/detail/pisa-2022-hervorragende-leistungen-und-wege-zur-verbesserung> |
| Switzerland 2015: science 506 | IQS: <https://www.iqs.gv.at/pisa-2015>; NZZ: <https://www.nzz.ch/schweiz/von-singapur-bis-frankreich-die-gewinner-und-verlierer-von-pisa-2015-ld.132867> |
| Hasty readers 6.6 % (2018) to 11.4 % (2025), OECD average | OECD, PISA 2025 Results Vol. I, executive summary: <https://www.oecd.org/en/publications/pisa-2025-results-volume-i_73451bc5-en/full-report/executive-summary_3701b0ef.html> |
| 3.4 hours per weekday of leisure screen time, OECD average | Reuters via U.S. News, 8.9.2026: <https://www.usnews.com/news/world/articles/2026-09-08/teen-reading-slumps-to-worst-this-century-due-to-surge-in-screen-time> |
| Maths 2025: Austria 477, Germany 464 | IQS/APA via Schule.at (above); OECD country note Germany (above) |
