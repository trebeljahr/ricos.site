#!/usr/bin/env node
/**
 * Serve the built export the way Cloudflare will: the assets Worker
 * (wrangler.jsonc, out/) and the API Worker (workers/api) under local
 * `wrangler dev`, behind one port that routes like the zone does:
 *
 *   /api/*           → ricos-site-api
 *   everything else  → ricos-site-client (files, _redirects, _headers)
 *
 *   pnpm build && pnpm preview          # PORT=58731 by default
 *
 * The API Worker reads its secrets from workers/api/.dev.vars (gitignored)
 * when present. Without them signup and confirm answer as a deployment with
 * missing settings would; validation, CORS, quotes and photos still work.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.PORT || 58731);
const API_PREFIXES = ["/api/"];

if (!existsSync("out/index.html")) {
  console.error("out/ holds no export: run `pnpm build` first.");
  process.exit(1);
}
if (!existsSync("workers/api/generated/api-data.json")) {
  console.error("No API Worker data: run `pnpm api:data` first.");
  process.exit(1);
}

/** A free port picked by the OS. */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const children = [];
function wrangler(config, port) {
  const child = spawn(
    "pnpm",
    [
      "exec",
      "wrangler",
      "dev",
      "-c",
      config,
      "--port",
      String(port),
      "--ip",
      "127.0.0.1",
      "--local",
    ],
    {
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  child.on("exit", (code) => {
    console.error(`wrangler (${config}) exited with ${code}`);
    shutdown(1);
  });
  children.push(child);
}

function shutdown(code = 0) {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

const clientPort = await freePort();
const apiPort = await freePort();
wrangler("wrangler.jsonc", clientPort);
wrangler("workers/api/wrangler.jsonc", apiPort);

http
  .createServer((req, res) => {
    const path = req.url ?? "/";
    const port = API_PREFIXES.some((prefix) => path.startsWith(prefix)) ? apiPort : clientPort;
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port,
        method: req.method,
        path,
        headers: {
          ...req.headers,
          "cf-connecting-ip": req.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "127.0.0.1",
        },
      },
      (answer) => {
        res.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(res);
      },
    );
    upstream.on("error", (error) => {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end(`preview: upstream not ready (${error.message})`);
    });
    req.pipe(upstream);
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`[preview] http://127.0.0.1:${PORT}  (client :${clientPort}, api :${apiPort})`);
  });
