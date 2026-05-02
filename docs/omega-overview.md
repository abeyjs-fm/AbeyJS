# Omega: runtime and intents

`OmegaRuntime` (`@abeyjs/runtime`) is the object you typically create once in **`omegaSetup.ts`** and share (channel + dispatch + optional plugin registry). The runtime should feel **familiar** if you know CQRS-lite buses: nominal typed intents from **`@abeyjs/core`** and follow-up effects via **`channel.publish`**.

## Live pieces inside the process

| Concept | Where it actually lives |
|----------|----------------------|
| Built **intent** | `intentOf("Domain/ActionName", payload)` |
| **`dispatch`** | `runtime.dispatch(intent)` hits handlers registered in **`omegaSetup`**, plugins’ **`onIntent`**, etc. |
| **`channel`** | Namespaced pub/sub strings you choose (`omega/...` is only convention) |
| **Flows** | **`@abeyjs/flows`**: declarative graphs reacting to intents/events |
| **Agents** | **`@abeyjs/agents`**: encapsulate observable state + intents |
| **`StateCell` / state** | state package / OpenAPI agent view slices |

**Do not confuse:** **`dispatch` ≠ HTTP**. HTTP belongs in agents using **`OmegaHttp`**. Intents are the **first link** client-side after user input.

---

## Recommended cycle (UI → server → DOM)

1. OM click calls **`state` handler** ⇒ **`dispatch(intentOf(...))`**.
2. Listener (flow or pure function registered in setup) runs async/sync work.
3. Result ⇒ **`channel.publish`** (same handler or next flow block).
4. OM view / reactive list / form subscriber updates local model.

This makes intent **replay** in tests easy with a fake channel. It also isolates HTTP in the agent when OpenAPI evolves.

---

## Intent naming

We prefer **`PascalDomain`** + verb for readability in logs:

- **`Music/TrackCreate`**, **`Finance/InvoiceList`**.

With **`registerOpenApiAllCrud`**, names like **`ApiProducts/List`** derive from paths to reduce clashes; rename or filter in the view layer when needed. More on OpenAPI: **`/guides/crud-auto`**.

---

## CLI ecosystem generator (**`abeyjs generate ecosystem`**)

Vertical slice scaffolding—not new philosophy:

- **`omega/semantics.ts`**: symbolic intents.
- **`agent` / `behavior` / `flow`**: full example lifecycle.
- **`installXxxOmega(runtime)`**: function you wire from `omegaSetup`.

Maintained as example **within the repo** because large teams copied inconsistent structures. Your later tweaks are not semver-rigid library output—baseline reference snapshot.

When you need the broader **product vision** doc, read **`/guides/vision`** in addition to this technical page.

---

## Team debugging tips

| Symptom | Check first |
|---------|---------------------|
| Intents “never arrive” | Setup before final bootstrap? Idempotent handlers vs repeated teardown? |
| Double effect same intent | Two conflicting flows—add discriminator on payload/channel topic. |
| Stale UI | View subscribed to the right agent cells (see `examples/crud-app`). |

For telemetry across integrations use shell **`omega/nav:changed`** in addition to domain intents.

Next: **`/guides/cli`**.
