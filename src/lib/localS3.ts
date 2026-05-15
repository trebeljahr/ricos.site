import { createRequire } from "node:module";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { cwd } from "node:process";
import { S3Client } from "@aws-sdk/client-s3";

export const SOURCE_BUCKET = "images.trebeljahr.com";
export const RESIZED_BUCKET = "images.trebeljahr.com.resized";

export const LOCAL_S3_DATA_DIR = resolve(cwd(), ".local-s3-data");
export const ASSETS_ROOT = resolve(cwd(), "src/content/Notes/assets");

const SOURCE_BUCKET_DIR = join(LOCAL_S3_DATA_DIR, SOURCE_BUCKET);
const RESIZED_BUCKET_DIR = join(LOCAL_S3_DATA_DIR, RESIZED_BUCKET);
const ASSETS_SYMLINK = join(SOURCE_BUCKET_DIR, "assets");
const ASSETS_TARGET_RELATIVE = "../../src/content/Notes/assets";

const require = createRequire(import.meta.url);

let localClient: S3Client | null = null;

function isCorrectSymlink(pathname: string, target: string): boolean {
  try {
    const st = lstatSync(pathname);
    return st.isSymbolicLink() && readlinkSync(pathname) === target;
  } catch {
    return false;
  }
}

function pathExists(pathname: string): boolean {
  try {
    lstatSync(pathname);
    return true;
  } catch {
    return false;
  }
}

export function ensureLocalS3Layout() {
  mkdirSync(SOURCE_BUCKET_DIR, { recursive: true });
  mkdirSync(RESIZED_BUCKET_DIR, { recursive: true });

  const resolvedTarget = resolve(SOURCE_BUCKET_DIR, ASSETS_TARGET_RELATIVE);
  if (!existsSync(resolvedTarget)) {
    throw new Error(
      `${resolvedTarget} doesn't exist.\n` +
        "Initialize the Notes submodule first:\n" +
        "  git submodule update --init --recursive\n" +
        "Or run in remote-image mode (no local S3, no disk):\n" +
        "  npm run dev:remote",
    );
  }

  if (!isCorrectSymlink(ASSETS_SYMLINK, ASSETS_TARGET_RELATIVE)) {
    if (existsSync(ASSETS_SYMLINK) || pathExists(ASSETS_SYMLINK)) {
      unlinkSync(ASSETS_SYMLINK);
    }
    symlinkSync(ASSETS_TARGET_RELATIVE, ASSETS_SYMLINK);
  }
}

export function clearLocalS3Cache() {
  rmSync(RESIZED_BUCKET_DIR, { recursive: true, force: true });
  mkdirSync(RESIZED_BUCKET_DIR, { recursive: true });
}

export function createLocalS3Client(): S3Client {
  ensureLocalS3Layout();
  if (localClient) return localClient;

  const client = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-2" });
  const { createS3Client: createMockS3Client, resetMocks } =
    require("mock-aws-s3-v3") as typeof import("mock-aws-s3-v3");

  resetMocks(SOURCE_BUCKET);
  resetMocks(RESIZED_BUCKET);
  createMockS3Client({
    localDirectory: LOCAL_S3_DATA_DIR,
    bucket: SOURCE_BUCKET,
    s3Client: client,
  });
  createMockS3Client({
    localDirectory: LOCAL_S3_DATA_DIR,
    bucket: RESIZED_BUCKET,
    s3Client: client,
  });

  localClient = client;
  return client;
}
