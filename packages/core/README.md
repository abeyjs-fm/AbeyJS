# `@abeyjs/core`

This package is AbeyJs stripped to the spine: **one channel**, **typed events**, **intents**, and the naming rules everything else hangs on. No screens, no network stack, no flow engine, no agents—those imports **this**.

The boundary stays sharp on purpose—anything attaching to Omega is expected to speak the same `OmegaEvent` / `Intent` dialect and reuse the agreed ids and metadata.

---

## OmegaChannel

The channel is the **single bus** for the app. Parts of the system don’t call each other by deep imports; they **publish** and **listen**.

- `publish(name, payload, meta?)` builds a full `OmegaEvent` (sequenced id, correlation, timestamp) and emits it.
- `emit` / `emitTyped` are the primitive path when you already have the envelope.
- `on` subscribes to one name; `onAll` sees the firehose (tracing, coordinators, inspectors).
- `namespace(name)` returns a scoped view: emits are tagged; listeners resolve events that belong to that scope or carry no explicit namespace.

You normally get one channel instance from runtime setup and thread it everywhere that matters.

---

## Events versus intents

**Events** (`OmegaEvent`) record what already occurred: bounded payload + `EventMeta` (correlation id, timestamp, optional source).

**Intents** (`OmegaIntent`, alias `Intent`) are **commands**: “someone requested this”. Same rough envelope as events—the split is intentional so flows and tooling can branch on semantics without overloading strings.

Builders:

- `omegaEventFromName(...)` assigns a sequential `ev:…` id unless you override.
- `intentOf(...)` does the symmetric job for intents (`intent:…`).

---

## Correlation vs sequence

**Correlation ids** tie a chain of publishes together (replay, diagnostics, tracing). **`createCorrelationId()`** hands you a branded id (UUID where the runtime allows).

**Sequential ids** from **`omegaNextSequencedId(prefix)`** are for stable ordering inside logs and tooling. They answer a different question than correlation.

---

## Wire names

Stringly event names drift. Helpers here constrain them:

| Shape | Meaning |
|--------|---------|
| `omegaEventNameDottedCamel("authLoginSuccess")` | `"auth.login.success"` via camelCase breakpoints |
| `omegaEventNameEnumWire("authLoginSuccess")` | literal wire equals the identifier |
| Same pair exists for intents (`omegaIntentNameDottedCamel` / `omegaIntentNameEnumWire`) |

`OmegaAgentId` / `OmegaFlowId` helpers exist so registration strings stay coherent.

---

## OmegaObject and OmegaFailure

`OmegaObject` is the minimalist contract (`id`, `meta`) shared by intents, failures, anything we treat as first-class instrumentation.

`OmegaFailure` wraps a human-readable `message`, optional structured `details`, and the usual metadata.

---

## IntentHandler

```ts
type IntentHandler<TPayload, TContext> = (payload: TPayload, ctx: TContext) => void | Promise<void>;
```

Runtime and glue layers compose these; definitions live here because every layer needs the same signature.

---

## Layout

```
channel/     OmegaChannel + namespaced façade
events/      OmegaEvent, EventMeta, listeners
semantics/   intents, naming, typed envelopes, intentOf
types/       OmegaObject, OmegaFailure
```

Root-level `omega-correlation-id.ts` and `omega-sequencer.ts` are helpers too small for their own folder.

---

## Dependents

`@abeyjs/runtime`, `@abeyjs/flows`, `@abeyjs/agents`, `@abeyjs/http`, and `@abeyjs/view` all anchor here. Respect the `"sideEffects": false` constraint: consumers should tree-shake what they never import.

---

## Build

```bash
npm run build -w @abeyjs/core
```
