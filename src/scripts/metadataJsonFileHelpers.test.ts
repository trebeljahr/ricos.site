import { execFile, spawnSync } from "node:child_process";
import { promises as fsPromises } from "node:fs";
import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { editMetadataFile } from "src/lib/metadataJsonFile";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadWithMetadata } from "./aws/helpers";
import {
  type ImageMetadata,
  updateMetadataFile,
  updateMetadataFileBulk,
} from "./metadataJsonFileHelpers";

// No real S3: every PutObject succeeds without leaving the machine.
vi.mock("src/lib/aws", () => ({
  createS3Client: () => ({ send: async () => ({}) }),
  getAllStorageObjectKeys: vi.fn(),
  getImageMetadataFromFileSystemOrAWS: vi.fn(),
}));

const door: ImageMetadata = {
  key: "assets/photography/bolivia-2025/door.jpg",
  width: 4000,
  height: 3000,
  aspectRatio: 4000 / 3000,
  existsInS3: false,
  alt: "A red wooden door in a white adobe wall",
  altSource: "ai",
};

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "metadata-json-"));
  file = path.join(dir, "metadata.json");
  await writeFile(file, `${JSON.stringify({ [door.key]: door }, null, 2)}\n`);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf-8"));
}

/** The entry an upload writes: dimensions and S3 state, no alt text. */
function uploaded(key: string, width = 1200, height = 800): ImageMetadata {
  return { key, width, height, aspectRatio: width / height, existsInS3: true };
}

describe("updateMetadataFile", () => {
  it("keeps the alt text of an entry an upload updates", async () => {
    await updateMetadataFile(file, uploaded(door.key, 4000, 3000));

    expect((await readJson(file))[door.key]).toEqual({ ...door, existsInS3: true });
  });

  it("leaves valid JSON when many updates run in parallel", async () => {
    // Keys of different lengths give writes of different sizes. Overlapping
    // writes once left the tail of a longer write after the closing brace.
    const updates = Array.from({ length: 200 }, (_, i) =>
      uploaded(`assets/photography/vietnam-2026/${"x".repeat(i % 37)}${i}.jpg`),
    );

    await Promise.all([
      ...updates.map((update) => updateMetadataFile(file, update)),
      updateMetadataFile(file, uploaded(door.key, 4000, 3000)),
    ]);

    const metadata = await readJson(file);
    expect(Object.keys(metadata)).toHaveLength(201);
    expect(metadata[door.key].alt).toBe(door.alt);
    expect(await readdir(dir)).toEqual(["metadata.json"]);
  });

  it("merges into the file on disk, not a copy read earlier", async () => {
    await updateMetadataFile(file, uploaded("assets/a.jpg"));

    // Another tool (/dev/alt-review, the asset watcher) saves in between.
    const onDisk = await readJson(file);
    onDisk["assets/a.jpg"].alt = "A hand-written description";
    await writeFile(file, JSON.stringify(onDisk));

    await updateMetadataFile(file, uploaded("assets/b.jpg"));

    const metadata = await readJson(file);
    expect(metadata["assets/a.jpg"].alt).toBe("A hand-written description");
    expect(metadata["assets/b.jpg"]).toEqual(uploaded("assets/b.jpg"));
    expect(metadata[door.key]).toEqual(door);
  });

  it("does not save over a file it cannot parse", async () => {
    await writeFile(file, "{ broken");

    await expect(updateMetadataFile(file, uploaded(door.key))).rejects.toThrow(/does not parse/);
    expect(await readFile(file, "utf-8")).toBe("{ broken");

    // A failed update must not block the ones queued after it.
    await writeFile(file, "{}");
    await updateMetadataFile(file, uploaded("assets/c.jpg"));
    expect(await readJson(file)).toEqual({ "assets/c.jpg": uploaded("assets/c.jpg") });
  });
});

describe("updateMetadataFileBulk", () => {
  it("saves every entry of an upload run and keeps existing alt text", async () => {
    const photo = path.join(dir, "door.jpg");
    await writeFile(photo, "not really a jpeg");

    const entry = await uploadWithMetadata(photo, door.key, {
      width: "4000",
      height: "3000",
      aspectRatio: String(4000 / 3000),
    });
    expect(entry).toEqual(uploaded(door.key, 4000, 3000));

    await updateMetadataFileBulk(file, [
      entry as ImageMetadata,
      uploaded("assets/photography/pai-2026/river.jpg"),
    ]);

    const metadata = await readJson(file);
    expect(metadata[door.key]).toEqual({ ...door, existsInS3: true });
    expect(metadata["assets/photography/pai-2026/river.jpg"]).toEqual(
      uploaded("assets/photography/pai-2026/river.jpg"),
    );
  });

  it("does not touch the file when there is nothing to save", async () => {
    const before = await readFile(file, "utf-8");
    await writeFile(file, before.trimEnd());

    await updateMetadataFileBulk(file, []);

    expect(await readFile(file, "utf-8")).toBe(before.trimEnd());
  });
});

describe("editMetadataFile", () => {
  it("saves a field edit with a trailing newline and keeps the rest of the entry", async () => {
    const saved = await editMetadataFile(file, (metadata) => {
      const entry = metadata[door.key];
      if (entry) entry.altReviewed = true;
      return true;
    });

    expect(saved).toBe(true);
    const text = await readFile(file, "utf-8");
    expect(text.endsWith("}\n")).toBe(true);
    expect(JSON.parse(text)[door.key]).toEqual({ ...door, altReviewed: true });
    expect(await readdir(dir)).toEqual(["metadata.json"]);
  });

  it("does not touch the file when the edit returns false", async () => {
    const before = await readFile(file, "utf-8");
    await writeFile(file, before.trimEnd());

    const saved = await editMetadataFile(file, (metadata) => {
      delete metadata[door.key];
      return false;
    });

    expect(saved).toBe(false);
    expect(await readFile(file, "utf-8")).toBe(before.trimEnd());
  });

  it("does not run the edit on a file it cannot parse", async () => {
    await writeFile(file, "{ broken");
    const edit = vi.fn(() => true);

    await expect(editMetadataFile(file, edit)).rejects.toThrow(/does not parse/);
    expect(edit).not.toHaveBeenCalled();
    expect(await readFile(file, "utf-8")).toBe("{ broken");
  });

  it("shares one queue with updateMetadataFile, so no edit is lost", async () => {
    // Every writer of metadata.json in one process goes through this queue.
    // Interleaved read-modify-writes would drop some of these keys.
    await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        i % 2 === 0
          ? updateMetadataFile(file, uploaded(`assets/upload-${i}.jpg`))
          : editMetadataFile(file, (metadata) => {
              metadata[`assets/edit-${i}.jpg`] = uploaded(`assets/edit-${i}.jpg`);
              return true;
            }),
      ),
    );

    const metadata = await readJson(file);
    expect(Object.keys(metadata)).toHaveLength(101);
    expect(metadata[door.key]).toEqual(door);
    expect(await readdir(dir)).toEqual(["metadata.json"]);
  });

  it("leaves the old file and no temp file when the write fails", async () => {
    const before = await readFile(file, "utf-8");
    vi.spyOn(fsPromises, "rename").mockRejectedValueOnce(new Error("disk full"));

    await expect(
      editMetadataFile(file, (metadata) => {
        delete metadata[door.key];
        return true;
      }),
    ).rejects.toThrow("disk full");

    expect(await readFile(file, "utf-8")).toBe(before);
    expect(await readdir(dir)).toEqual(["metadata.json"]);
  });
});

describe("editMetadataFile across processes", () => {
  const addKey = (key: string) => (metadata: Record<string, unknown>) => {
    metadata[key] = uploaded(key);
    return true;
  };

  it("waits while another process holds the lock", async () => {
    // The parent process is alive, so its lock is not stale.
    await writeFile(`${file}.lock`, `${process.ppid} someone-else\n`);

    let saved = false;
    const pending = editMetadataFile(file, addKey("assets/waited.jpg")).then(() => {
      saved = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(saved).toBe(false);
    expect((await readJson(file))["assets/waited.jpg"]).toBeUndefined();

    await rm(`${file}.lock`);
    await pending;
    expect((await readJson(file))["assets/waited.jpg"]).toEqual(uploaded("assets/waited.jpg"));
    expect(await readdir(dir)).toEqual(["metadata.json"]);
  });

  it("takes over a lock left by a process that died", async () => {
    const { pid } = spawnSync(process.execPath, ["-e", ""]);
    await writeFile(`${file}.lock`, `${pid} crashed\n`);

    await editMetadataFile(file, addKey("assets/after-crash.jpg"));

    expect((await readJson(file))["assets/after-crash.jpg"]).toBeDefined();
    expect(await readdir(dir)).toEqual(["metadata.json"]);
  });

  it("takes over a lock older than 30 seconds", async () => {
    await writeFile(`${file}.lock`, `${process.ppid} stuck\n`);
    const aMinuteAgo = new Date(Date.now() - 60_000);
    await utimes(`${file}.lock`, aMinuteAgo, aMinuteAgo);

    await editMetadataFile(file, addKey("assets/after-stuck.jpg"));

    expect((await readJson(file))["assets/after-stuck.jpg"]).toBeDefined();
    expect(await readdir(dir)).toEqual(["metadata.json"]);
  });

  it("loses no edit when several processes save at once", { timeout: 60_000 }, async () => {
    const child = path.join(dir, "child.mts");
    await writeFile(
      child,
      `import { editMetadataFile } from ${JSON.stringify(path.resolve("src/lib/metadataJsonFile.ts"))};
const [file, id] = process.argv.slice(2);
await Promise.all(
  Array.from({ length: 25 }, (_, i) =>
    editMetadataFile(file, (metadata) => {
      const key = \`assets/process-\${id}-\${i}.jpg\`;
      metadata[key] = { key, width: 1, height: 1, aspectRatio: 1, existsInS3: true };
      return true;
    }),
  ),
);
`,
    );
    const tsx = path.resolve("node_modules/.bin/tsx");

    await Promise.all(
      Array.from({ length: 6 }, (_, id) => promisify(execFile)(tsx, [child, file, String(id)])),
    );

    const metadata = await readJson(file);
    expect(Object.keys(metadata)).toHaveLength(1 + 6 * 25);
    expect(metadata[door.key]).toEqual(door);
    expect((await readdir(dir)).sort()).toEqual(["child.mts", "metadata.json"]);
  });
});
