import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(__dirname, "../dist");

fs.mkdirSync(distRoot, { recursive: true });

// Cloudflare Pages reads _redirects from the publish root (dist/), not nested folders.
fs.writeFileSync(
  path.join(distRoot, "_redirects"),
  "/certificates/*  /certificates/index.html  200\n",
);

fs.writeFileSync(
  path.join(distRoot, "index.html"),
  `<!doctype html><meta http-equiv="refresh" content="0;url=/certificates/login" />\n`,
);

console.log("Prepared dist/_redirects and dist/index.html for Cloudflare Pages");
