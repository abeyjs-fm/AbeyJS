/**
 * Convierte `docs/*.md` → vistas OM `app.doc.<carpeta>.view.html`.
 * `{}`/`{{ }}` dentro de `<pre>` o `<code>` quedan literales gracias a exclusiones del compilador y del binder OM.
 *
 * Ejecutar en `docs/web`: **`npm run generate:guides-html`**
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOC_WEB = resolve(HERE, "..");
const DOC_ROOT = resolve(DOC_WEB, "..");

marked.setOptions({ gfm: true, breaks: true });

function stripLeadingH1(md) {
  return md.replace(/^\s*#\s+.+\r?\n+/, "").trimStart();
}

/** Scroll wide GFM tables horizontally without `display: block` on `<table>` (keeps sticky thead). */
function wrapMarkdownTables(html) {
  const re = /<table\b[^>]*>|<\/table\s*>/gi;
  let depth = 0;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    out += html.slice(last, m.index);
    const tag = m[0];
    if (/^<\/table/i.test(tag)) {
      if (depth > 0) {
        depth -= 1;
        out += "</table>";
        if (depth === 0) out += "</div>";
      } else {
        out += tag;
      }
    } else {
      if (depth === 0) out += '<div class="doc-md-table-wrap">';
      depth += 1;
      out += tag;
    }
    last = re.lastIndex;
  }
  out += html.slice(last);
  return out;
}

/** [carpetaGuía, ficheroMarkdown] */
const rows = [
  ["intro", "intro-abeyjs.md"],
  ["quick-start", "quick-start.md"],
  ["bootstrap-shell", "view-bootstrap-shell.md"],
  ["routing", "view-routing.md"],
  ["abey-component", "view-abey-component.md"],
  ["data-views", "view-data-driven.md"],
  ["omega", "omega-overview.md"],
  ["cli", "cli-reference.md"],
  ["monorepo", "monorepo-desarrollo.md"],
  ["vision", "vision-omegax.md"],
  ["abey-templates", "abey-templates.md"],
  ["crud-auto", "crud-automatico-omegax.md"],
  ["security", "security-omegax.md"],
  ["tables", "abey-table.md"],
  ["table-flows", "abey-table-flows.md"],
  ["entities-forms", "entidad-modelo-y-formularios.md"],
];

for (const [folder, mdName] of rows) {
  const mdPath = join(DOC_ROOT, mdName);
  const md = readFileSync(mdPath, "utf8");
  const inner = wrapMarkdownTables(
    String(await marked.parse(stripLeadingH1(md))).trim(),
  );
  const outDir = join(DOC_WEB, "src", "views", "guides", folder);
  mkdirSync(outDir, { recursive: true });
  const outfile = join(outDir, `app.doc.${folder}.view.html`);
  writeFileSync(
    outfile,
    `<section data-role="doc-guide-root">
  <article data-doc="markdown">
${inner}
  </article>
</section>
`,
    "utf8",
  );
}

console.log("OK:", rows.length, "guides → *.view.html");
