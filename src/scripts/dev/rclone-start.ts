/**
 * Start a local rclone S3 server with prod-parity layout.
 *
 * Layout (same shape as prod):
 *   .rclone-data/
 *     images.trebeljahr.com/
 *       assets/  →  symlink to src/content/Notes/assets  (Obsidian folder)
 *     images.trebeljahr.com.resized/   (plain dir, grows as variants cache)
 *
 * Why rclone instead of MinIO:
 *   Modern MinIO wraps every object with xl.meta sidecars — it's no longer
 *   a filesystem passthrough, so "point MinIO at existing files" doesn't
 *   work anymore. rclone's `serve s3` keeps the old filesystem semantics:
 *   each file on disk IS an S3 object, symlinks are followed (with -L),
 *   zero duplication of the Obsidian assets folder.
 *
 * API surface is identical: same S3 protocol on :9100, same env vars, same
 * access keys. Anything that talked to MinIO talks to rclone unchanged.
 *
 * Console: rclone doesn't ship a web console, but you can point any S3
 * browser (Cyberduck, Transmit, AWS CLI) at localhost:9200 with the
 * minioadmin/minioadmin credentials.
 *
 * The rclone binary is auto-downloaded into node_modules/.cache/rclone/ on
 * first run (see ./lib/rclone-binary.ts). No homebrew / host-package
 * dependency — a fresh `npm install && npm run dev` works.
 */
import "dotenv/config";
import { spawn } from "child_process";
import {
  existsSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  lstatSync,
} from "fs";
import { join, resolve } from "path";
import { cwd } from "process";
import { ensureRclone } from "./lib/rclone-binary";

const API_PORT = process.env.S3_API_PORT ?? "9200";
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID ?? "minioadmin";
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin";

const DATA_DIR = resolve(cwd(), ".rclone-data");
const SOURCE_BUCKET_DIR = join(DATA_DIR, "images.trebeljahr.com");
const RESIZED_BUCKET_DIR = join(
  DATA_DIR,
  "images.trebeljahr.com.resized"
);
const ASSETS_SYMLINK = join(SOURCE_BUCKET_DIR, "assets");
const ASSETS_TARGET_RELATIVE = "../../src/content/Notes/assets";

function ensureLayout() {
  mkdirSync(SOURCE_BUCKET_DIR, { recursive: true });
  mkdirSync(RESIZED_BUCKET_DIR, { recursive: true });

  const resolvedTarget = resolve(SOURCE_BUCKET_DIR, ASSETS_TARGET_RELATIVE);
  if (!existsSync(resolvedTarget)) {
    console.error(
      `error: ${resolvedTarget} doesn't exist.\n` +
        "Create src/content/Notes/assets (or initialize the Notes submodule) first."
    );
    process.exit(1);
  }

  if (existsSync(ASSETS_SYMLINK)) {
    let ok = false;
    try {
      const st = lstatSync(ASSETS_SYMLINK);
      if (st.isSymbolicLink()) {
        const current = readlinkSync(ASSETS_SYMLINK);
        ok = current === ASSETS_TARGET_RELATIVE;
      }
    } catch {
      /* fall through to recreate */
    }
    if (!ok) {
      // Something else is there (or wrong-target symlink) — replace it so the
      // bucket always mirrors the current Obsidian folder.
      try {
        unlinkSync(ASSETS_SYMLINK);
      } catch {
        /* ignore */
      }
    }
  }
  if (!existsSync(ASSETS_SYMLINK)) {
    symlinkSync(ASSETS_TARGET_RELATIVE, ASSETS_SYMLINK);
    console.log(`linked ${ASSETS_SYMLINK} → ${ASSETS_TARGET_RELATIVE}`);
  }
}

async function run() {
  const rclone = await ensureRclone();
  // -L follows symlinks transparently, so the `assets` symlink under the
  // source bucket resolves into the Obsidian folder with no duplication.
  const proc = spawn(
    rclone,
    [
      "serve",
      "s3",
      "-L",
      "--addr",
      `:${API_PORT}`,
      "--auth-key",
      `${ACCESS_KEY},${SECRET_KEY}`,
      DATA_DIR,
    ],
    {
      stdio: "inherit",
      env: process.env,
    }
  );
  proc.on("error", (err) => {
    console.error("rclone failed to start:", err);
    process.exit(1);
  });
  proc.on("exit", (code) => process.exit(code ?? 0));

  const shutdown = () => proc.kill("SIGTERM");
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

ensureLayout();
console.log(`Starting rclone serve s3 on http://localhost:${API_PORT}`);
console.log(`  bucket images.trebeljahr.com          → symlink to src/content/Notes/assets`);
console.log(`  bucket images.trebeljahr.com.resized  → local cache at .rclone-data/`);
console.log(`  auth: ${ACCESS_KEY} / ${SECRET_KEY}`);
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
