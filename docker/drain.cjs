// Shutdown drain for a Node HTTP server behind Coolify's Traefik.
// Loaded ahead of the server: `node --require ./drain.cjs server.js`.
//
// Coolify replaces a container by starting the new one, waiting for it
// to turn healthy, then running `docker stop` on the old one. Traefik
// keeps routing to the old container until it has EXITED, so a request
// sent to it while it shuts down gets a 502, and one in flight when its
// network goes away hangs until a 504. Two things make Traefik drop a
// container early: its Docker health leaving `healthy`, and a failed
// check of Traefik's own load-balancer health check.
//
// So on SIGTERM this file:
//   1. answers both probes with 503, and nothing else:
//      · Docker's, at once — Coolify runs it INSIDE the container against
//        127.0.0.1; visitors never arrive over loopback.
//      · Traefik's, after PROXY_GRACE_MS — sent straight from Traefik
//        with an `X-Hatchkit-Drain` header. A visitor's request is
//        FORWARDED by Traefik, which always adds X-Forwarded-For, so a
//        visitor can't pose as the probe even by sending the header.
//        Traefik drops a container on ONE failed check, so failing it at
//        once could empty the pool: Coolify stops this container as soon
//        as Docker calls the new one healthy, and Traefik can take 2 s
//        more to add the new one.
//      Outside a drain Traefik's probe gets a 200 from here, without
//      reaching the app: it asks every few seconds, and a server-rendered
//      `/` would render each time.
//   2. waits SHUTDOWN_DRAIN_SECONDS: time for Traefik's next check, or
//      for Docker to count enough failed probes, to take the container
//      out of rotation.
//   3. then runs the server's own SIGTERM handling (Next.js closes its
//      server and exits): every SIGTERM listener the server registers is
//      held until the drain ends. A server with none gets its HTTP
//      servers closed and the process exited.
//
// SHUTDOWN_DRAIN_SECONDS comes from the Dockerfile and is timed against
// the health checks hatchkit sets on the Coolify app. Unset or
// 0 turns all of this off: dev, tests, and a compose app, whose container
// is stopped BEFORE its replacement starts, so draining only delays that.
// HEALTH_CHECK_PATH lists the probed paths, comma-separated; the default
// is the two hatchkit configures, `/` and `/api/health`. SIGINT (Ctrl-C)
// is never delayed.
//
// SIGTERM has to reach THIS process. `dotenvx run` forwards it and then
// SIGKILLs its command 5 s later, so an image that starts the server
// through dotenvx (or npx) runs drain-entrypoint as PID 1, which signals
// the pid this file writes to HATCHKIT_DRAIN_PIDFILE instead.
"use strict";

const { writeFileSync } = require("node:fs");
const http = require("node:http");
const { isMainThread } = require("node:worker_threads");

const drainMs = Math.max(0, Number(process.env.SHUTDOWN_DRAIN_SECONDS) || 0) * 1000;
const healthPaths = (process.env.HEALTH_CHECK_PATH || "/,/api/health")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
// After the drain, how long the server's own shutdown (or, without one,
// in-flight requests) may take before its connections are cut. With the
// 20 s drain this ends at 28 s, inside `docker stop`'s 30 s before SIGKILL.
const CLOSE_TIMEOUT_MS = 8000;
// How long after SIGTERM Traefik's probe keeps passing (see the header),
// and never more than a quarter of the drain.
const PROXY_GRACE_MS = Math.min(4000, drainMs / 4);

// A child this process forks inherits `--require`. Only the process that
// was started with it drains; the child keeps its normal SIGTERM.
const owner = process.env.HATCHKIT_DRAIN_PID;
if (drainMs > 0 && isMainThread && (owner === undefined || owner === String(process.pid))) {
  process.env.HATCHKIT_DRAIN_PID = String(process.pid);
  if (process.env.HATCHKIT_DRAIN_PIDFILE) {
    try {
      writeFileSync(process.env.HATCHKIT_DRAIN_PIDFILE, String(process.pid));
    } catch {
      // Unwritable: the entrypoint signals its own child, as without us.
    }
  }
  install();
}

function install() {
  const servers = new Set();
  let draining = false;
  let drainingSince = 0;
  let finished = false;
  let timer;
  let heldCalls = 0;
  let release;
  const drained = new Promise((resolve) => {
    release = resolve;
  });

  const isDockerProbe = (req) => {
    const peer = req.socket.remoteAddress;
    const loopback = peer === "127.0.0.1" || peer === "::1" || peer === "::ffff:127.0.0.1";
    return loopback && healthPaths.includes((req.url || "").split("?")[0]);
  };
  const isTraefikProbe = (req) =>
    req.headers["x-hatchkit-drain"] !== undefined && req.headers["x-forwarded-for"] === undefined;

  // Every http.Server: track the listening ones, and answer the probes.
  const emit = http.Server.prototype.emit;
  http.Server.prototype.emit = function (event, ...args) {
    if (event === "listening") servers.add(this);
    if (event === "close") servers.delete(this);
    if (event === "request") {
      const [req, res] = args;
      const traefik = isTraefikProbe(req);
      const proxyDraining = draining && Date.now() - drainingSince >= PROXY_GRACE_MS;
      if (traefik ? proxyDraining : draining && isDockerProbe(req)) {
        res.writeHead(503, { "content-type": "text/plain", connection: "close" });
        res.end("draining\n");
        return true;
      }
      if (traefik) {
        res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" });
        res.end("serving\n");
        return true;
      }
    }
    return emit.call(this, event, ...args);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    release();
    const exit = () => process.exit(0);
    // Held listeners ran on this signal, and now run on the promise
    // above. They own the shutdown, but must finish before `docker stop`
    // escalates to SIGKILL; past CLOSE_TIMEOUT_MS cut what is left and exit.
    if (heldCalls > 0) {
      setTimeout(() => {
        for (const server of servers) server.closeAllConnections?.();
        exit();
      }, CLOSE_TIMEOUT_MS).unref();
      return;
    }
    let open = servers.size;
    if (open === 0) exit();
    for (const server of servers) {
      server.close(() => {
        open -= 1;
        if (open === 0) exit();
      });
    }
    setTimeout(() => {
      for (const server of servers) server.closeAllConnections?.();
      exit();
    }, CLOSE_TIMEOUT_MS).unref();
  };

  const onSigterm = () => {
    // A second SIGTERM means stop waiting.
    if (draining) return finish();
    draining = true;
    drainingSince = Date.now();
    console.log(
      `[drain] SIGTERM: failing the health checks for ${drainMs / 1000}s so the proxy stops routing here, then shutting down`,
    );
    timer = setTimeout(finish, drainMs);
  };
  // Registered before process.on is wrapped below, so it is the one
  // SIGTERM listener that runs at once.
  process.on("SIGTERM", onSigterm);

  // Hold every other SIGTERM listener until the drain ends. `once` and
  // `prependOnceListener` go through `on` and `prependListener`.
  const held = new WeakMap();
  const hold = (listener) => {
    if (typeof listener !== "function") return listener;
    let wrapper = held.get(listener);
    if (!wrapper) {
      wrapper = function (...args) {
        heldCalls += 1;
        drained.then(() => listener.apply(this, args));
      };
      held.set(listener, wrapper);
    }
    return wrapper;
  };
  for (const name of ["on", "addListener", "prependListener"]) {
    const original = process[name];
    process[name] = function (event, listener) {
      return original.call(this, event, event === "SIGTERM" ? hold(listener) : listener);
    };
  }
  for (const name of ["off", "removeListener"]) {
    const original = process[name];
    process[name] = function (event, listener) {
      return original.call(
        this,
        event,
        event === "SIGTERM" ? (held.get(listener) ?? listener) : listener,
      );
    };
  }
}
