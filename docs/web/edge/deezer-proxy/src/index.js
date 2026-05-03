/**
 * CORS-safe relay for Deezer public JSON API.
 * Deploy with Wrangler — see README in this folder.
 */
const DEEZER_ORIGIN = "https://api.deezer.com";

function cors(origin) {
  const o = typeof origin === "string" ? origin.trim() : "";
  if (!o.length) return { "Access-Control-Allow-Origin": "*" };
  if (
    o.includes("localhost") ||
    o.includes("github.io") ||
    o.endsWith(".pages.dev") ||
    o.includes("workers.dev")
  ) {
    return {
      "Access-Control-Allow-Origin": o,
      "Vary": "Origin",
    };
  }
  return { "Access-Control-Allow-Origin": "*" };
}

export default {
  async fetch(request) {
    const originHdr = cors(request.headers.get("Origin"));

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...originHdr,
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") ?? "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          ...originHdr,
          "Content-Type": "text/plain; charset=utf-8",
          Allow: "GET, HEAD, OPTIONS",
        },
      });
    }

    const incoming = new URL(request.url);
    const pathname = incoming.pathname || "/";
    if (
      pathname !== "/" &&
      !pathname.startsWith("/search") &&
      !pathname.startsWith("/artist") &&
      !pathname.startsWith("/genre") &&
      !pathname.startsWith("/track") &&
      !pathname.startsWith("/album")
    ) {
      return new Response("Forbidden", {
        status: 403,
        headers: {
          ...cors(request.headers.get("Origin")),
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
    const deezerUrl = `${DEEZER_ORIGIN}${pathname === "/" ? "/" : pathname}${incoming.search}`;

    const upstream = await fetch(deezerUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: {
        "User-Agent": "AbeyJs-Docs-Deezer-Proxy/1",
        Accept: "application/json",
      },
      redirect: "follow",
    });

    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(originHdr)) {
      out.set(k, v);
    }
    out.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
