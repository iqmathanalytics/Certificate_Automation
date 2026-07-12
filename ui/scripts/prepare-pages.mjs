import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(__dirname, "../dist");
const appIndex = path.join(distRoot, "certificates", "index.html");

if (!fs.existsSync(appIndex)) {
  console.error("Missing dist/certificates/index.html — vite build may have failed");
  process.exit(1);
}

fs.mkdirSync(distRoot, { recursive: true });

// SPA fallback for client routes under /certificates (assets are real files and win first)
fs.writeFileSync(
  path.join(distRoot, "_redirects"),
  [
    "/certificates/assets/*  /certificates/assets/:splat  200",
    "/certificates/*         /certificates/index.html     200",
    "/",
  ].join("\n") + "\n",
);

// Root page: NO auto-refresh (that caused an infinite reload when SPA fell back to /index.html)
fs.writeFileSync(
  path.join(distRoot, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>IQmath Certificates</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#0f172a}
    a{color:#1e3a5f;font-weight:600}
  </style>
</head>
<body>
  <p><a href="/certificates/login">Open Certificate Admin →</a></p>
</body>
</html>
`,
);

console.log("Prepared dist/_redirects and non-looping dist/index.html");
