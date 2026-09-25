# PISA 2025 · Schweiz: LinkedIn video

A 71-second vertical video (1080 × 1920, 30 fps, H.264) for the Lerngesellschaft
LinkedIn page. The idea comes from The Economist's short "Are teenagers getting
dumber?" (24 September 2026), retold in German with Swiss data. It is our own
work: no Economist footage, script, charts or design are used.

- `pisa-2025-lesen-9x16.mp4` is the upload file. It has no voice or music, so
  it works for LinkedIn's muted autoplay; all information is on screen, and a
  silent AAC track is included for player compatibility.
- `cover.png` is the thumbnail frame (the opening question).
- `video.html` holds the animation. Each frame is a pure function of time.
  Open it in a browser with `#t=20` appended to the URL to inspect a moment.
- `render.mjs` renders the frames in headless Chromium and encodes them with
  ffmpeg.

Essential content stays between y = 300 and y = 1620, so a centred 4:5 crop
(1080 × 1350) keeps it intact. Fonts are the landing page's Bricolage Grotesque
and Hanken Grotesk (SIL Open Font License, so video use is allowed). Colours
follow the landing page (`#241d2b`, `#f4d575`) plus a pink for declines.

## Re-render

```sh
# needs Playwright (npm) and an ffmpeg build with libx264
node social/pisa-2025/render.mjs                           # full MP4
node social/pisa-2025/render.mjs --stills=3.5,20.5,41      # PNG stills in ./stills
FFMPEG=/path/to/ffmpeg CHROMIUM=/path/to/chrome node social/pisa-2025/render.mjs
```

Text changes go in `video.html`. Scene windows use `data-start`/`data-end`.
Every element with `data-in` fades and slides in at that second and leaves
with its scene.

## On-screen text (Swiss Standard German)

| Time | Scene |
|---|---|
| 0–4.6 s | NEUE PISA-RESULTATE · **Werden unsere Jugendlichen dümmer?** · Was die Zahlen für die Schweiz zeigen. |
| 4.6–12 s | PISA misst nicht Intelligenz, sondern was 15-Jährige können. · Mathematik, Schweiz: **499** Punkte · OECD-Durchschnitt: 463 · Nur drei OECD-Länder schneiden besser ab. |
| 12–22 s | Doch beim Lesen geht es abwärts. Line chart 2015 492 · 2018 484 · 2022 483 · 2025 **470** («So tief wie noch nie») · OECD-Durchschnitt 2025: 461 |
| 22–30.6 s | **−22** Punkte beim Lesen seit 2015 · Nach einer Faustregel der OECD entsprechen rund 20 Punkte einem Schuljahr. · Bars 22 vs. 20 · Auch in Mathematik: minus 22 Punkte, von 521 auf 499. |
| 30.6–43 s | Mehr als ein Viertel der 15-Jährigen liest zu schwach, um die Hauptaussage eines mittellangen Textes selbstständig zu erfassen. · Waffle chart: 2015 19,9 % → 2022 24,7 % → 2025 **28,8 %** · Bei den Knaben: 34,2 % |
| 43–55 s | **Warum?** Laut OECD gehen schwächere Leseleistungen einher mit: mehr Bildschirmzeit · weniger Lesen zum Vergnügen · mehr «hastigem Lesen» (Texte überfliegen, schnell falsch antworten). · Und: Jugendliche in der Schweiz nutzen KI für die Schule häufiger als im OECD-Durchschnitt. |
| 55–64 s | **Lesen beginnt nicht mit 15.** Es beginnt mit Sprache: mit Gesprächen, Geschichten und Fragen. **Und mit einem Gegenüber, das zuhört.** |
| 64–71 s | Lerngesellschaft · Basel · Neugier begleiten. Möglichkeiten eröffnen. · lerngesellschaft.ch · Gemeinnütziger Verein. Bildungsangebote für Kinder und Schulen in Basel. · Sources |

## Claims and sources

The OECD, SBFI and EDK pages could not be opened from the build environment
(network policy). Every figure below was therefore cross-checked in at least two
independent reports of the primary sources. **Before posting, check the
figures marked ▲ against the national report on pisa-schweiz.ch or the SBFI
press release.**

| Claim | Source |
|---|---|
| Maths 499, OECD 463; only three OECD countries score higher. Science 501 (OECD 482). Reading 470 (OECD 461). | SBFI press release, 8.9.2026: <https://www.sbfi.admin.ch/de/newnsb/9EI2n5acP3WE>; EDK: <https://edk.ch/de/die-edk/news/mm20260908> |
| Reading 492 (2015) to 470 (2025); maths 521 to 499; 2025 is the lowest ever in Switzerland | OECD country note: <https://www.oecd.org/en/publications/pisa-2025-results-volume-i-country-notes_2d4ff9ea-en/switzerland_3aa7a464-en.html>; SRF: <https://www.srf.ch/news/schweiz/pisa-studie-2025-schweiz-bleibt-stark-verliert-aber-in-lesen-und-mathematik> |
| Reading 484 (2018), 483 (2022) | Earlier PISA cycles, e.g. NZZ on PISA 2022: <https://www.nzz.ch/schweiz/pisa-erhebung-schweizer-schueler-schneiden-in-mathematik-sehr-gut-beim-lesen-hapert-es-ld.1768827> |
| About 20 points ≈ one school year (OECD rule of thumb, varies by country) | OECD Education and Skills Today: <https://oecdedutoday.com/the-state-of-global-education-according-to-pisa/>; OECD PISA 2025 Results, Vol. I |
| ▲ Weak readers (below level 2): 19.9 % (2015), 24.7 % (2022), 28.8 % (2025); boys 34.2 %; definition | SRF (above); 20 Minuten: <https://www.20min.ch/story/schweizer-jugendliche-pisa-studie-faehigkeiten-in-mathe-und-lesen-nehmen-ab-103629481>; national report: <https://www.pisa-schweiz.ch> |
| "More screen time and less reading for pleasure have gone hand in hand with weaker results … more hasty reading" (Mathias Cormann, OECD) | Reuters via U.S. News, 8.9.2026: <https://www.usnews.com/news/world/articles/2026-09-08/teen-reading-slumps-to-worst-this-century-due-to-surge-in-screen-time> |
| Young people in Switzerland use AI for school significantly more often than the OECD average | SBFI press release (above) |

Deliberately left out because they could not be verified to the same standard:
Swiss 2025 figures on reading for pleasure (the "over 50 %" in circulation may
be PISA 2018 data), and 45.9 % weak readers among students who speak only other
languages at home (single source).

Wording choices: the video says "Jugendliche in der Schweiz", as the SBFI does,
not "Schweizer Jugendliche". Causes are framed as the OECD frames them,
"gehen einher mit": a correlation, not a proven cause.

## LinkedIn post (draft)

> Werden unsere Jugendlichen dümmer?
>
> Das fragte kürzlich The Economist. Wir haben die neuen PISA-Resultate für die Schweiz angeschaut.
>
> PISA misst nicht Intelligenz, sondern was 15-Jährige können. In Mathematik gehört die Schweiz zur Spitze: 499 Punkte, nur drei OECD-Länder schneiden besser ab.
>
> Beim Lesen dagegen geht es abwärts:
> – 470 Punkte, so tief wie noch nie in der Schweiz. Seit 2015 sind es 22 Punkte weniger – nach einer Faustregel der OECD rund ein Schuljahr.
> – 28,8 % der 15-Jährigen lesen zu schwach, um die Hauptaussage eines mittellangen Textes selbstständig zu erfassen (2015: 19,9 %). Bei den Knaben sind es 34,2 %.
>
> Laut OECD gehen schwächere Leseleistungen mit mehr Bildschirmzeit, weniger Lesen zum Vergnügen und «hastigem Lesen» einher.
>
> Lesen beginnt nicht mit 15. Es beginnt mit Sprache: mit Gesprächen, Geschichten und Fragen – und mit einem Gegenüber, das zuhört. Daran arbeiten wir in Basel.
>
> Quellen: OECD, PISA 2025 Results (8.9.2026); SBFI/EDK, Medienmitteilung vom 8.9.2026; SRF, 8.9.2026.
>
> #PISA2025 #Lesekompetenz #Bildung #Frühförderung #Basel

## Optional voiceover (about 65 s)

The video works muted. If someone records a voice later, this text follows the
scene timing:

> Werden unsere Jugendlichen dümmer? – Vorweg: PISA misst nicht Intelligenz, sondern was 15-Jährige können. Und in Mathematik gehört die Schweiz zur Spitze: 499 Punkte. Nur drei OECD-Länder schneiden besser ab.
>
> Doch beim Lesen geht es abwärts: von 492 Punkten im Jahr 2015 auf 470. So tief wie noch nie. Das sind 22 Punkte weniger – nach einer Faustregel der OECD rund ein Schuljahr.
>
> Mehr als ein Viertel der 15-Jährigen liest inzwischen zu schwach, um die Hauptaussage eines mittellangen Textes zu erfassen. 2015 war es noch jeder Fünfte. Bei den Knaben ist es mehr als jeder Dritte.
>
> Warum? Laut OECD gehen schwächere Leseleistungen einher mit mehr Bildschirmzeit, weniger Lesen zum Vergnügen und hastigem Lesen. Und: Jugendliche in der Schweiz nutzen KI für die Schule häufiger als im OECD-Durchschnitt.
>
> Lesen beginnt aber nicht mit 15. Es beginnt mit Sprache – mit Gesprächen, Geschichten und Fragen. Und mit einem Gegenüber, das zuhört.
>
> Lerngesellschaft. Neugier begleiten. Möglichkeiten eröffnen.
