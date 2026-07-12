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

/**
 * Cloudflare Pages often uses "SPA / 404 → /index.html" for unknown paths.
 * That previously served a static landing page for /certificates/login.
 * Root index.html MUST be the React shell so that fallback still boots the app.
 * Nested /certificates/index.html remains the canonical app entry.
 */
fs.writeFileSync(path.join(distRoot, "index.html"), appHtml);
fs.writeFileSync(path.join(distRoot, "404.html"), appHtml);

/**
 * Explicit rewrites (assets are real files and take precedence over these rules).
 * Do not leave incomplete redirect lines — they break the whole _redirects file.
 */
fs.writeFileSync(
  path.join(distRoot, "_redirects"),
  [
    "/certificates/*  /certificates/index.html  200",
    "/               /certificates/            302",
  ].join("\n") + "\n",
);

console.log("Prepared dist/_redirects, dist/index.html, and dist/404.html for Pages SPA routing");
