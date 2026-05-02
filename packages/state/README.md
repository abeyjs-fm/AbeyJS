# `@abeyjs/state`

Minimal **observable value holder**: **`StateCell<T>`** stores a single value, notifies subscribers on change, and supports functional updates. It is intentionally tiny so views and agents can share UI-facing state without pulling in a full external store.

Uses **`Object.is`** to skip no-op writes (same reference or primitive value).

---

## API

### `StateCell<T>`

| Method | Behaviour |
|--------|-----------|
| **`get()`** | Current snapshot. |
| **`set(next)`** | Replace with **`next`**, or resolve **`next(prev)`** when **`next` is a function. No-op if **`Object.is(resolved, prev)`**. |
| **`update(fn)`** | Alias for **`set(fn)`** with an updater only (clearer at call sites). |
| **`subscribe(listener)`** | **`listener()`** runs after every effective **`set`**; returns **`Unsubscribe`** (`@abeyjs/core`). |

Subscriptions are **synchronous** on **`set`**: listeners run in insertion order (Set iteration order in V8). **No** batching or async scheduling — if you need that, wrap or debounce in the subscriber.

**Threading:** single-threaded JS; not safe to share one cell across workers without a bridge.

---

## Typical use

- **View models** passed into **`@abeyjs/view`** helpers that call **`cell.subscribe(() => render…)`**.
- **Agents** exposing **`viewState` as `StateCell`** (see **`DynamicCrudAgent`** in **`@abeyjs/openapi`**).

---

## Dependency

**`@abeyjs/core`** — **`Unsubscribe`** type only.

---

## Build

```bash
npm run build -w @abeyjs/state
```
