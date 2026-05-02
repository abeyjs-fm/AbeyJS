/**
 * **`@abeyjs/http`** — JSON-oriented `fetch` client that publishes **`CH_HTTP_REQUEST`**, **`CH_HTTP_RESPONSE`**, and
 * **`CH_HTTP_ERROR`** on an **`OmegaChannel`** from `@abeyjs/core`, with optional GET caching and mutation-driven
 * entity invalidation.
 *
 * Primary API: **`createOmegaHttp`**. Full narrative (lifecycle tables, defaults, pitfalls) lives in **`README.md`**.
 */
export {
  createOmegaHttp,
  CH_HTTP_ERROR,
  CH_HTTP_REQUEST,
  CH_HTTP_RESPONSE,
  type OmegaHttp,
  type HttpMethod,
  type OmegaHttpErrorPayload,
  type OmegaHttpRequestInterceptor,
  type OmegaHttpCacheOptions,
  type OmegaHttpOptions,
} from "./client.js";
