import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(__dirname, "../dist");
const appDir = path.join(distRoot, "certificates");
const appIndex = path.join(appDir, "index.html");

if (!fs.existsSync(appIndex)) {
  console.error("Missing dist/certificates/index.html — vite build may have failed");
  process.exit(1);
}

fs.mkdirSync(distRoot, { recursive: true });

const appHtml = fs.readFileSync(appIndex, "utf8");

// Root + nested 404 shells (Pages may serve these on missing paths)
fs.writeFileSync(path.join(distRoot, "index.html"), appHtml);
fs.writeFileSync(path.join(distRoot, "404.html"), appHtml);
fs.writeFileSync(path.join(appDir, "404.html"), appHtml);

/**
 * Cloudflare Pages 308-redirects `/certificates/index.html` → directory form.
 * Proxy SPA routes to `/certificates/` (not `.../index.html`) or the rewrite fails.
 * Asset identity rule must come first — redirects always run, even when a file exists.
 * @see https://developers.cloudflare.com/pages/configuration/redirects/
 */
fs.writeFileSync(
  path.join(distRoot, "_redirects"),
  [
    "/certificates/assets/*  /certificates/assets/:splat  200",
    "/certificates/*         /certificates/               200",
    "/                       /certificates/               302",
  ].join("\n") + "\n",
);

/**
 * Only invoke Pages Function for app routes (keeps asset requests free/static).
 * Function lives at ui/functions/certificates/[[path]].js
 */
fs.writeFileSync(
  path.join(distRoot, "_routes.json"),
  JSON.stringify(
    {
      version: 1,
      include: ["/certificates/*"],
      exclude: ["/certificates/assets/*", "/certificates/", "/certificates/404.html"],
    },
    null,
    2,
  ) + "\n",
);

console.log("Prepared dist/_redirects, _routes.json, and SPA fallback HTML");
