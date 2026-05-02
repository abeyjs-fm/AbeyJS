# Documentación AbeyJs



Los **`*.md` en esta carpeta** pueden usarse sólo como **fuente opcional**: el sitio **no** los importa en runtime. Las guías viven como OM en **`docs/web/src/views/guides/**`** (`*.view.html` + `*.view.ts`); editá los HTML ahí o regenerá desde Markdown.



**Sitio navegable estilo docs de frameworks (sidebar + contenido prose):**



1. Desde la raíz del monorepo: `npm install` si aún no lo hiciste.

2. Tras cambiar los `*.md` que quieras reflejar: en **`docs/web`** ejecutá **`npm run generate:guides-html`** (regenera cada `app.doc.*.view.html`).

3. `npm run docs:dev` — abre Vite en el puerto **5190**.

4. `npm run docs:build` / `npm run docs:preview` para el build estático (`docs/web/dist`).



Código fuente del sitio: **`docs/web/`** (`bootstrapOmegaApp`, OM, tema omega + **`doc-shell.css`** + **`doc-guide.view.css`** en shadow de cada guía).



### Páginas (orden sugerido)



| Ruta web | Vistas OM |

|---------|-----------|

| `/guides/intro` | `web/src/views/guides/intro/` |

| `/guides/quick-start` | `web/src/views/guides/quick-start/` |

| `/guides/bootstrap-shell` | `web/src/views/guides/bootstrap-shell/` |

| `/guides/routing` | `web/src/views/guides/routing/` |

| `/guides/abey-component` | `web/src/views/guides/abey-component/` |

| `/guides/data-views` | `web/src/views/guides/data-views/` |

| `/guides/omega` | `web/src/views/guides/omega/` |

| `/guides/cli` | `web/src/views/guides/cli/` |

| `/guides/monorepo` | `web/src/views/guides/monorepo/` |

| `/guides/vision` | `web/src/views/guides/vision/` |

| `/guides/abey-templates` | `web/src/views/guides/abey-templates/` |

| `/guides/crud-auto` | `web/src/views/guides/crud-auto/` |

| `/guides/security` | `web/src/views/guides/security/` |

| `/guides/tables` | `web/src/views/guides/tables/` |

| `/guides/table-flows` | `web/src/views/guides/table-flows/` |

| `/guides/entities-forms` | `web/src/views/guides/entities-forms/` |



En cada carpeta hay **`*.view.ts`** y **`*.view.html`** con el mismo cuerpo prose. En el sitio, todas aparecen bajo el grupo **Guías** en el sidebar (índice en **`/guides`**).



### Mapa Markdown → generador (referencia)



Si regenerás desde `docs/*.md`: `intro-abeyjs.md`, `quick-start.md`, `view-bootstrap-shell.md`, `view-routing.md`, `view-abey-component.md`, `view-data-driven.md`, `omega-overview.md`, `cli-reference.md`, `monorepo-desarrollo.md`, `vision-omegax.md`, `abey-templates.md`, `crud-automatico-omegax.md`, `security-omegax.md`, `abey-table.md`, `abey-table-flows.md`, `entidad-modelo-y-formularios.md` (ver `docs/web/scripts/generate-guide-html.mjs`).

