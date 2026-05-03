# AbeyJs: runtime and intents

The **AbeyJS runtime** is the object you typically create once (type **`OmegaRuntime`** from `@abeyjs/runtime`) in **`omegaSetup.ts`** and share (channel + dispatch + optional plugin registry). The runtime should feel **familiar** if you know CQRS-lite buses: nominal typed intents from **`@abeyjs/core`** and follow-up effects via **`channel.publish`**.

## Live pieces inside the process

| Concept | Where it actually lives |
|----------|----------------------|
| Built **intent** | `intentOf("Domain/ActionName", payload)` |
| **`dispatch`** | `runtime.dispatch(intent)` hits handlers registered in **`omegaSetup`**, plugins’ **`onIntent`**, etc. |
| **`channel`** | Namespaced pub/sub topic strings you choose (for example `MySlice/events/…`) |
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

## Browser globals (`exposeBootstrapRuntime`)

In Vite/browser apps that use **`bootstrapOmegaApp`** with **`createOmega`**, **`@abeyjs/view`** calls **`exposeBootstrapRuntime(runtime)`** after the shell resolves the **`OmegaRuntime`**. That sets **`globalThis.__abeyRuntime`** and (**if unset**) **`globalThis.__abeyDi.channel`** to a getter that forwards to **`runtime.channel**.

**Why:** several DOM layers (**`abey-table`**, **`abey-widget`**, **`abey-form`**, **`@AbeyComponent`**) default to reading **`OmegaRuntime`** from **`globalThis`** via a dotted path (**`runtimepath`** / **`runtime-path`**, default **`"__abeyRuntime"`**), so lazy chunks and kit elements still find the same bus without threading **`runtime`** through every constructor.

**Not covered by this helper:** registering **`abey-*`** custom elements (**`registerAbeyJsUi()`** in **`main.ts`**), providing DI tokens on **`OmegaContainer`**, or publishing table columns/items on the channel — those stay in your **`omegaSetup`** and slice code. See **`docs/abey-table.md`** for a checklist when **`abey-table`** stays empty in flow mode.

---

## Intent naming

We prefer **`PascalDomain`** + verb for readability in logs:

- **`Music/TrackCreate`**, **`Finance/InvoiceList`**.

With **`registerOpenApiAllCrud`**, names like **`ApiProducts/List`** derive from paths to reduce clashes; rename or filter in the view layer when needed. More on OpenAPI: **`/guides/crud-auto`**.

---

## CLI ecosystem generator (**`abeyjs generate ecosystem`**)

Vertical slice scaffolding—not new philosophy:

- **`slice/semantics.ts`** (CLI layout may vary): symbolic intents.
- **`agent` / `behavior` / `flow`**: full example lifecycle.
- **`installXxx…(runtime)`** registrar: function you wire from `omegaSetup`.

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

---

## `OmegaContainer: missing provider for token "abeyjs:…"`

**What it means:** something called **`runtime.get(someToken)`** (or **`di.get`**) before any code registered a value or factory for that token on **`OmegaContainer`**. Tokens from **`omegaToken("name")`** show up in the error as **`abeyjs:name`** (internally **`Symbol.for("abeyjs:name")`**).

**Typical cause:** you copied an **`installXxxOmega(runtime)`** helper (ecosystem slice, agent that needs **`OmegaHttp`**, etc.) from an example that assumed another module had already run—e.g. **`registerCommon`** providing **`TOK_DEEZER_HTTP`**, **`TOK_HTTP`**, etc.—but your **`createOmega()`** only calls the installer and never registers those services.

**Fix:**

1. Register a module **before** the code that **`get`s** the token:

   ```ts
   const runtime = createOmegaRuntime();

   runtime.registerModule((c, rt) => {
     c.provideFactory(TOK_MY_HTTP, () =>
       createOmegaHttp({ channel: rt.channel, baseUrl: "/api", source: "my-app" }),
     );
   });

   installMySlice(runtime); // may call runtime.get(TOK_MY_HTTP)
   ```

2. Use the **same** token identity everywhere: import a shared **`export const TOK_MY_HTTP = omegaToken("my_http")`** (or always use the same string in **`omegaToken("…")`**) so **`provideFactory`** and **`get`** refer to one symbol.

3. **Order:** **`registerModule`** first, then **`registerAgent`**, flows, and **`onIntent`** wiring that depends on DI.

**Reference in this repo:** **`examples/MyMiusic/src/common/register-common.ts`** pairs **`provideFactory`** with **`installArtistOmega`**; **`docs/web`** registers **`registerDeezerHttpModule`** in **`omegaSetup.ts`** before **`installArtistOmega`** for the same pattern.

Next: **`/guides/cli`**.
