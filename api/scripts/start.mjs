#!/usr/bin/env node
/**
 * Prefer IPv4 before Prisma/db connect (TiDB Cloud AAAA often fails from Render).
 */
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { spawn } from "child_process";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true, env: process.env });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

await run("npx", ["prisma", "db", "push"]);
await run("node", ["dist/index.js"]);
