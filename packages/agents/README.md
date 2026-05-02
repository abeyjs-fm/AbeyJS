# `@abeyjs/agents`

Agents package the **orthogonal logic** AbeyJs hangs next to flows: same `OmegaChannel` everyone listens to, but routing is **rule-first** instead of a long switchboard of manual subscriptions.

Concrete pieces:

### `OmegaAgent`

- Fixed `id`, shared `OmegaChannel`, pluggable **`OmegaAgentBehaviorEngine`**, mutable `state` bag, **`OmegaAgentInbox`** for queued direct mail.
- Subscribes to **all channel events**. Each delivery becomes an `OmegaAgentBehaviorContext`; the behavior engine evaluates rules; **the first matching rule wins** → `OmegaAgentReaction` → subclass implements `onAction`.
- **`receiveIntent`**: flows (or coordinators) invoke this so intent-shaped traffic hits the exact same evaluation path—no duplicated parsing.
- **`connect()`**: hook for wiring timers, narrower channel listeners via `protected on`, outbound publishes, whatever the subclass needs once construction finished.
- **`publish` / `emit`**: forwards to `OmegaChannel`; default `source` metadata is stamped with `this.id` so traces stay attributable.
- **`receiveMessage`** / **`onMessage`**: opt-in pathway for **`OmegaAgentProtocol`** point-to-point traffic.

Agents do **not** own the UI—they react and emit—so `@abeyjs/view` or `@abeyjs/runtime` chooses when to instantiate and register them.

### Behavior stack

An **`OmegaAgentBehaviorEngine`** collects ordered **`OmegaAgentBehaviorRule`** entries: `(condition, reactionFactory)`. Matching is deterministic: top-to-bottom, first boolean `true`.

**`OmegaAgentReaction`** is intentionally tiny: `{ action: string; payload?: unknown }`, enough for subclasses to fork without dragging entire channel envelopes through every branch.

Contexts carry either an **`OmegaEvent`** or an **`Intent`**, plus the shared `state` map rules may read or poke.

### `OmegaStatefulAgent<TState>`

Wraps **`StateCell`** from `@abeyjs/state` for **view-facing snapshots** (`viewState`). The opaque `state` map remains available for coarse rule data (`OmegaAgent.state`).

### Messaging

**`OmegaAgentMessage`** is `from → to → action (+ payload)`. **`OmegaAgentProtocol`** keeps a registry, supports `send` to one id or `broadcast` (system envelopes fan out individually). **`OmegaAgentInbox`** is FIFO; optional capped length drops oldest on overflow—useful during storms.

---

## Dependency graph

Depends on **`@abeyjs/core`** (channel/events/intents) and **`@abeyjs/state`** (`StateCell` helper). Typical upstream partner: **`OmegaRuntime`** registers agents beside flows.

---

## Build

```bash
npm run build -w @abeyjs/agents
```
