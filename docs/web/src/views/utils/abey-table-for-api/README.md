# `abey-table` implementation (Omega + remote data)

This document is how I put together the **`abey-table-for-api`** sample under **`docs/web`**: the demo lives at **`/abey-table`**, and the long inline guide is **`ui/app-abey-table.view.html`**. This README is the same map from the codebase side.

**Public repo:** [https://github.com/abeyjs-fm](https://github.com/abeyjs-fm)

## Why it is not “just config on the table”

I wanted a table with **pagination and server-backed search**, without **`fetch`** in the template. In **`flow`** mode the table raises intents; the agent replies with **`emit`** events for columns, actions, and items. That split needs a single naming contract (**`ArtistEcosystem`** in **`omega/semantics.ts`**) and a running runtime (**`globalThis.__abeyRuntime`** after Omega bootstrap).

| Aspect | Local (`config` in TS) | Omega + `loadNetwork` (this demo) |
|--------|------------------------|-------------------------------------|
| Row source | `rows` / columns synchronously in-process | Repo or HTTP in the **agent**; skeleton until first **`eventItems`** |
| Pagination / search | Optionally filter client-side (`loadNetwork=false`) | Each **`page`**, **`pageSize`**, or search text change fires **`intentLoad`** with **`query`** |
| Data contract | Everything in **`AbeyTableConfig`** | **`intent*`** / **`event*`** wired by string into **`semantics`** |
| Global runtime | Optional | **`bootstrapOmegaApp`** + **`exposeBootstrapRuntime`** ⇒ **`__abeyRuntime`** |
| Custom element | **`registerAbeyJsUi()`** | Same + **`AbeyTableElement.define("abey-table")`** in **`#wire`** before the tag exists |

You can mix modes: **`#wire`** sets **`getRowId`** and a minimal **`config`** until the first **`eventItems`** lands on the channel.

## Folder tree (from **`docs/web/src/`**)

```
docs/web/src/
├── main.ts                               # registerAbeyJsUi + bootstrap Omega
├── omegaSetup.ts                         # installArtistOmega
├── utils-routes.ts                       # /abey-table
├── routes.ts                             # lazy-load biew
└── views/utils/abey-table-for-api/
    ├── README.md
    ├── ui/
    │   ├── app-abey-table.biew.ts        # component + #wire + state
    │   ├── app-abey-table.view.html      # markup + embedded guide
    │   └── app-abey-table.view.css
    ├── omega/
    │   ├── semantics.ts                  # canonical intents/events names
    │   ├── behavior.ts                   # intent string → agent action
    │   ├── agent.ts                      # loadTable + emits
    │   ├── flow.ts
    │   └── register.ts                   # installArtistOmega(runtime)
    ├── data/
    │   └── artist.repo.ts                # page({ page, pageSize, query })
    └── model/
        └── artist.types.ts
```

Everything under **`abey-table-for-api/`** is self-contained except the **wiring**: **`main.ts`**, **`omegaSetup.ts`**, and the two route entries must import **`installArtistOmega`** and the **`biew`**.

## Build order that worked for me

If you repeat the feature in another slice, this sequence worked:

1. **Workspace deps**: **`@abeyjs/uikit`**, **`@abeyjs/view`**, **`@abeyjs/runtime`**, **`@abeyjs/http`**, **`@abeyjs/agents`**, **`@abeyjs/flows`**, **`@abeyjs/core`** (`intentOf`).
2. **Kit CSS**: with shadow DOM, **`@abeyjs/uikit/styles/abey-table.css?inline`** in **`stylesText`**; without shadow, **`abey.json`** / global import (see **`docs/quick-start`**).
3. **`main.ts`**: call **`registerAbeyJsUi()`** before routes mount views containing **`abey-table`**.
4. **Omega bootstrap**: **`createOmega()`** registers modules (HTTP, etc.) **before** **`installArtistOmega(runtime)`**; in docs that lives in **`omegaSetup.ts`** (after Deezer / **`OmegaHttp`** registration).
5. **`semantics.ts`**: single source of truth for intents and topics; HTML must use **matching literals**—a typo yields an empty table with no obvious error.
6. **`agent.ts`**: **`onAction("loadTable", payload)`** reads **`page`**, **`pageSize`**, **`query`**; call the repo then **emit** columns / actions / items (empty on errors if appropriate).
7. **`behavior.ts`**: map **`Artist/TableLoad`** → **`loadTable`** (same pattern for selection/action if enabled).
8. **`flow.ts`**: orchestrate **`ArtistFlow`**; optional UI expressions.
9. **`register.ts`**: **`runtime.onIntent`**, **`registerAgent`**, **`registerFlow`**, **`runtime.flow.activate(flow.id)`** — export **`installArtistOmega`** as one entrypoint.
10. **OM view**: **`biew`** with **`DOM_CHANNEL_FACTORY`**, **`state`** aligned with **`semantics`**, **`#wire`** defines **`abey-table`** plus minimal **`table.config`**.
11. **Routes**: **`utils-routes.ts`** + **`routes.ts`** with lazy **`biew`** import.
12. **Smoke test**: **`/abey-table`**, search (debounce + blur/Enter flush), pagination, selection if **`intentselection`** is on.

## What each piece does in this sample

- **`model/`**: types (**`DeezerArtist`**, etc.)—no DOM or direct **`fetch`** from the view.
- **`data/artist.repo.ts`**: **`page(...)`** contract; uses **`OmegaHttp`** internally.
- **`omega/semantics.ts`**: **`intentLoadTable`**, **`eventTableItems`**, **`flowId`**, …everything you duplicate between HTML and TS.
- **`omega/agent.ts`**: “call API, return events”.
- **`omega/register.ts`**: the **`install*`** you call from **`omegaSetup.ts`**.

## Quick contract: table attributes

In **`app-abey-table.view.html`**, attributes must match **`ArtistEcosystem`**:

- **`flow="true"`** — table subscribes to the channel (**`channel.onAll`**).
- **`loadNetwork="true"`** — **`query`** goes server-side; rows are not re-filtered locally.
- **`intentload`**, **`intentselection`**, **`intentaction`** — what **`runtime.dispatch`** emits on interaction.
- **`eventcolumns`**, **`eventactions`**, **`eventitems`** — event names published from the agent.
- Optional **`intentsearch`** for a search-only intent.

For **`eventItems`** I usually send **`items`**, **`totalItems`**, **`page`**, **`pageSize`**. Without a valid runtime on **`globalThis`**, intents go nowhere.

## Toolbar search (kit behavior)

Tunable via **`AbeyTableElement.searchDebounceMs`**. Also flushes pending search on blur, outside click (loses sticky focus), and **Enter** when a debounced dispatch was queued. Implementation: **`packages/uikit/src/table/abey-table.ts`**.

## Monorepo docs

- **`docs/abey-table.md`** — **`globalThis`** runtime basics in TS.
- **`docs/abey-table-flows.md`** — payload examples.

Together: page HTML is the visual guide; this README is the **mental changelog** for the same sample while browsing in the IDE.
