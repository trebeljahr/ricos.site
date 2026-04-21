/**
 * Lazy rclone installer — downloads the official rclone binary from GitHub
 * releases on first use, caches under node_modules/.cache/rclone/.
 *
 * This lets `npm install && npm run dev` work on a fresh checkout without
 * assuming the host has `brew install rclone` (or anything else). No
 * third-party npm wrapper package; the binary comes straight from upstream.
 *
 * Pinned to a specific version for reproducibility. Bump RCLONE_VERSION
 * (and optionally add a SHA256 check below) when upgrading.
 */
import { spawn } from "child_process";
import { existsSync, chmodSync, mkdirSync, writeFileSync } from "fs";
import { arch, platform } from "os";
import { join, resolve } from "path";
import { cwd } from "process";

const RCLONE_VERSION = "v1.73.5";

const CACHE_DIR = resolve(cwd(), "node_modules", ".cache", "rclone");

function osKey(): string {
  const p = platform();
  if (p === "darwin") return "osx";
  if (p === "linux") return "linux";
  if (p === "win32") return "windows";
  throw new Error(`unsupported platform: ${p}`);
}

function archKey(): string {
  const a = arch();
  if (a === "arm64") return "arm64";
  if (a === "x64") return "amd64";
  throw new Error(`unsupported arch: ${a}`);
}

function binaryName(): string {
  return platform() === "win32" ? "rclone.exe" : "rclone";
}

/**
 * Return the path to an executable rclone. Downloads + extracts it the
 * first time it's needed; subsequent calls return the cached path.
 */
export async function ensureRclone(): Promise<string> {
  const os = osKey();
  const ar = archKey();
  const dirName = `rclone-${RCLONE_VERSION}-${os}-${ar}`;
  const binPath = join(CACHE_DIR, dirName, binaryName());
  if (existsSync(binPath)) return binPath;

  mkdirSync(CACHE_DIR, { recursive: true });
  const zipName = `${dirName}.zip`;
  const zipUrl = `https://github.com/rclone/rclone/releases/download/${RCLONE_VERSION}/${zipName}`;
  const zipPath = join(CACHE_DIR, zipName);

  console.log(`[rclone] fetching ${RCLONE_VERSION} for ${os}-${ar}…`);
  await downloadFile(zipUrl, zipPath);

  console.log(`[rclone] extracting…`);
  await runCmd("unzip", ["-q", "-o", zipPath, "-d", CACHE_DIR]);

  if (!existsSync(binPath)) {
    throw new Error(
      `rclone binary not found at expected path after extract: ${binPath}`
    );
  }
  chmodSync(binPath, 0o755);
  console.log(`[rclone] installed at ${binPath}`);
  return binPath;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`download failed ${res.status} ${res.statusText}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
}

async function runCmd(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    p.stderr?.on("data", (c) => {
      stderr += c.toString();
    });
    p.on("exit", (code) =>
      code === 0
        ? resolveP()
        : rejectP(new Error(`${cmd} exited ${code}: ${stderr.trim()}`))
    );
    p.on("error", rejectP);
  });
}
