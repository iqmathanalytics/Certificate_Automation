/**
 * SPA fallback for /certificates/* client routes (login, issue, template, verify).
 * Assets under /certificates/assets/ are excluded via dist/_routes.json.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith("/certificates/assets/")) {
    return context.next();
  }

  // Serve the app shell (directory URL — /certificates/index.html 308s on Pages)
  return context.env.ASSETS.fetch(new URL("/certificates/", url.origin));
}
