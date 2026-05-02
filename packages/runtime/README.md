# `@abeyjs/runtime`

Application **composition root** for AbeyJs: wraps an **`OmegaChannel`** (`@abeyjs/core`), an **`OmegaFlowManager`** (`@abeyjs/flows`), lightweight **DI** (**`OmegaContainer`**), **agent** registration, optional **URL → intent** bridging, and an in-memory **trace ring** suited for the **Inspector** (`@abeyjs/inspector`).

Most apps create **one** **`OmegaRuntime`** inside **`omegaSetup`** (`createOmegaRuntime()`), then **`registerModule`**, **`registerAgent`**, **`registerPlugin`**, and **`onIntent`** handlers.

---

## Composition

| Member | Role |
|--------|------|
| **`channel`** | **`OmegaChannel`** shared by flows, HTTP (`@abeyjs/http`), agents, and UI adapters. |
| **`flow`** | **`OmegaFlowManager`** — **`dispatch`**, **`registerHandler`** (wrapped by **`runtime.onIntent`**). |
| **`di`** | **`OmegaContainer`** — **`provide`**, **`provideFactory`**, **`get`** / **`tryGet`**. |

Constructor wiring:

1. **`channel`** — injected or **`createChannel()`**.
2. **`createOmegaFlowManager(channel)`** — **`flow`** owns intent routing with correlation metadata.
3. **`channel.onAll`** captures every published event into **`_trace`** while **`setTraceEnabled(true)`** (default), capped at **2000** entries.

---

## Lifecycle API (`OmegaRuntime`)

### Intents & flows

- **`dispatch(intent, { source? })`** — forwards to **`flow.dispatch`**.
- **`onIntent(name, handler)`** — shorthand for **`flow.registerHandler`** (**`FlowManagerContext`** matches `@abeyjs/flows`).

### Agents

- **`registerAgent(factory)`** — invokes **`factory(channel)`**, **`connect()`** on success, replaces prior agent with same **`id`** after **`dispose`** on the old instance.

### Plugins

- **`registerPlugin({ id, install })`** — **`install(runtime)`** may return **teardown**; registering the same **`id`** runs previous teardown first.
- **`unregisterPlugin`**, **`disposeAll`** — teardown plugins and **all** agents (**`agents.clear`** after **`dispose`**).

### Modules & DI

- **`registerModule`** / **`registerModules`** — **`OmegaModule`** **`(container, runtime) => void`** executed **once per module function** (**`WeakSet`** dedupe).
- **`provide`**, **`provideFactory`**, **`get`**, **`tryGet`** — delegate to **`di`**.

### Trace

- **`getTraceSnapshot()`** — read-only view of the ring buffer (**`RuntimeTraceEvent`**).
- **`setTraceEnabled(on)`** — disables/enables capture (does not clear history).

Inspectors and bridges typically read **`getTraceSnapshot`** or subscribe live via **`channel.onAll`**.

---

## Types

 **`RuntimeTraceEvent`** — mirrors channel envelopes: **`name`**, **`data`** (payload), **`correlationId`**, **`timestamp`**, optional **`source`**.

 **`OmegaRegisteredAgent`** — **`id`**, **`connect()`**, **`dispose()`**; satisfied by **`OmegaAgent`** implementations in **`@abeyjs/agents`**.

 **`OmegaPlugin`** — named **`install`** hook with optional unsubscribe.

 **`OmegaModule`** — grouping hook for DI registration against **`OmegaContainer` + `OmegaRuntime`**.

---

## URL bridge (`url-bridge.ts`)

Browser helpers for **intent-first routing** (no framework router required):

| Function | Behaviour |
|----------|-----------|
| **`startUrlIntentSync(maps, flow, getPath?)`** | On load and optional **`popstate`**, match normalized pathname against **`PathIntentMap.path`**, **`flow.dispatch(intentOf(...))`**. No-op if **`window`** is undefined. |
| **`setPath(path)`** | **`history.pushState`** without reload. |
| **`intentFromQuery(search)`** | Deep link: **`?omegaIntent=Name&foo=bar`** → **`intentOf("Name", { foo: "bar" })`**. |

**`PathIntentMap`**: template path **without** leading slash, **`IntentType`**, optional **`toPayload`**, **`syncOnPopState`**.

---

## Dependencies

- **`@abeyjs/core`** — channel, **`Intent`**, **`intentOf`**, correlation metadata.
- **`@abeyjs/flows`** — **`OmegaFlowManager`**, **`FlowManagerContext`**.

---

## Build

```bash
npm run build -w @abeyjs/runtime
```
