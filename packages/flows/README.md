# `@abeyjs/flows`

Long-lived **orchestration** for AbeyJs: flows sit on the same `OmegaChannel` as everything else, but they own **state machines**, **intent reactions**, and **UI hints** that never needed to be raw bus traffic.

### `OmegaFlow`

- Subscribes to **all** channel events; `onEvent` only runs while `state === running`.
- `receiveIntent` mirrors that contract for intents pushed by `OmegaFlowManager`.
- `memory` is the scratch map persisted inside snapshots; `emitExpression` fans out to local listeners (loading banners, wizard copy, etc.) without polluting the global channel.
- `publish` / `emit` helpers stamp `source` with the flow id so traces stay attributable.
- Lifecycle hooks (`start`, `pause`, `sleep`, `end`, …) flip `OmegaFlowState` and keep the manager’s running list in sync.

### `OmegaFlowManager`

- Registry of flows plus **two intent pathways**:
  1. **`registerIntentHandler`** — lightweight predicates that may **`consumeIntent`** and short-circuit before running flows.
  2. **`registerHandler` + `dispatch`** — async-only fan-out for imperative glue (often wired from runtime helpers).
- **`handleIntent`** publishes `omega/intent:*` lifecycle markers, runs intent handlers, optionally consumes, then fans out to every **running** flow.
- **`activate` / `switchTo` / `activateExclusive`** coordinate which flows stay hot versus paused—think stacked modals or exclusive wizards.
- **`wireNavigator`** listens for `navigation.intent` (payload is a full `Intent`) and synthetic `navigate.*` events, forwarding them into whatever navigator object you inject—keeps router adapters out of the flows themselves.

### `OmegaWorkflowFlow`

Structured variant of `OmegaFlow`: register named steps (`defineStep`), jump with `startAt` / `next`, emit canonical `workflow.step`, `workflow.error`, `workflow.done` expressions. Base `onIntent` / `onEvent` are intentionally empty so subclasses drive everything through step ids.

### Supporting pieces

| Export | Role |
|--------|------|
| `OmegaIntentHandlerPipeline` | Fluent micro-pipeline (validate → execute → success/error hooks) that registers itself as an intent handler. |
| `OmegaIntentReducer` | Tiny fold over a single value driven by intent handlers. |
| `Omega` facade | One-liner `Omega.handle(manager, name, handler, { consumeIntent })`. |
| Snapshots + `OmegaSnapshotStorage` | Serialize / hydrate `memory`, `state`, `lastExpression`, `activeFlowId`. |

---

## Dependencies

`@abeyjs/core` for channel + intent types. Consumers: `@abeyjs/runtime`, ecosystems, CLI scaffolds.

---

## Build

```bash
npm run build -w @abeyjs/flows
```
