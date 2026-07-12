/**
 * Cloudflare Worker — serve certificate app at www.iqmath.in/certificates/*
 *
 * Setup:
 * 1. Deploy UI to Pages project `certificate-automation` (already done).
 * 2. Create a Worker named `iqmath-certificates-path` with this code.
 * 3. Add route: www.iqmath.in/certificates*
 * 4. Set PAGES_ORIGIN below if your Pages URL differs.
 *
 * After this, open: https://www.iqmath.in/certificates/login
 */
const PAGES_ORIGIN = "https://certificate-automation.pages.dev";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only handle /certificates and /certificates/...
    if (url.pathname !== "/certificates" && !url.pathname.startsWith("/certificates/")) {
      return new Response("Not found", { status: 404 });
    }

    // Proxy same path to Pages (Pages build nests assets under /certificates/)
    const target = new URL(url.pathname + url.search, PAGES_ORIGIN);
    const upstream = await fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    // Return Pages response (assets keep correct MIME types)
    const response = new Response(upstream.body, upstream);
    response.headers.set("x-proxied-from", "certificate-automation-pages");
    return response;
  },
};
