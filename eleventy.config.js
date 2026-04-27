import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItAttrs from "markdown-it-attrs";

export default function (eleventyConfig) {
  const md = markdownIt({
    html: true,
    typographer: true,
    breaks: false,
  })
    .use(markdownItFootnote)
    .use(markdownItAttrs);

  // Default footnote markup (footnote_ref → <sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>;
  // footnote section → <section class="footnotes">…</section>) is left intact.
  // We post-process the rendered HTML in the `sidenotes` transform below to
  // pair each marker with an inline sidenote span and tag the section for print.

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/social-card.svg");

  eleventyConfig.addTransform("sidenotes", function (content) {
    if (!this.page.outputPath || !this.page.outputPath.endsWith(".html")) return content;

    const sectionMatch = content.match(
      /<hr class="footnotes-sep"[^>]*>\s*<section class="footnotes">([\s\S]*?)<\/section>/
    );
    if (!sectionMatch) return content;

    const notes = {};
    const liRe = /<li id="fn(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
    let m;
    while ((m = liRe.exec(sectionMatch[1])) !== null) {
      let body = m[2];
      body = body.replace(/<a[^>]*class="footnote-backref"[^>]*>[\s\S]*?<\/a>/g, "");
      body = body.replace(/^\s*<p>([\s\S]*)<\/p>\s*$/, "$1");
      body = body.trim();
      notes[m[1]] = body;
    }

    let modified = content.replace(
      /<sup class="footnote-ref"><a href="#fn(\d+)"[^>]*id="fnref\d+(?::\d+)?"[^>]*>\[\d+\](?::\d+)?<\/a><\/sup>/g,
      (whole, n) => {
        const body = notes[n] || "";
        return (
          `<span class="note">` +
          `<span class="note-marker" data-fn="${n}" tabindex="0" role="button" aria-expanded="false" aria-controls="sidenote-${n}"><sup>${n}</sup></span>` +
          `<span class="sidenote" id="sidenote-${n}" data-fn="${n}"><span class="sidenote-num">${n}</span>${body}</span>` +
          `</span>`
        );
      }
    );

    modified = modified.replace(
      /<hr class="footnotes-sep"[^>]*>\s*<section class="footnotes">/,
      '<section class="footnotes-print" aria-label="Notes">'
    );

    return modified;
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
}
