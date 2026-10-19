import { describe, expect, it } from "vitest";
import type { ImageMetadata, MetadataFile } from "../lib/metadataJsonFile";
import { applyS3Sync, findDeletedKeys, findNotUploadedKeys } from "./syncMetadataRules";

function entry(key: string, existsInS3: boolean, alt?: string): ImageMetadata {
  return {
    key,
    width: 4000,
    height: 3000,
    aspectRatio: 4000 / 3000,
    existsInS3,
    ...(alt ? { alt, altSource: "manual" as const } : {}),
  };
}

const live = "assets/photography/bolivia-2025/salar.jpg";
const takenDown = "assets/photography/bolivia-2025/stranger.jpg";
const notUploadedYet = "assets/photography/pai-2026/river.jpg";
const uploadedByDrift = "assets/blog/red-door.jpg";
const newInS3 = "assets/photography/pai-2026/temple.jpg";

function metadataFile(): MetadataFile {
  return {
    [live]: entry(live, true, "Milky Way over the salt flat"),
    [takenDown]: entry(takenDown, true, "A man at a market stall"),
    [notUploadedYet]: entry(notUploadedYet, false, "A river at dusk, written before upload"),
    [uploadedByDrift]: entry(uploadedByDrift, false, "A red wooden door"),
  };
}

const s3Keys = new Set([live, uploadedByDrift, newInS3]);

describe("findDeletedKeys", () => {
  it("finds entries that were uploaded and are gone from S3", () => {
    expect(findDeletedKeys(metadataFile(), s3Keys)).toEqual([takenDown]);
  });

  it("treats an entry without existsInS3 as uploaded, like the sync always did", () => {
    const legacy = { key: "assets/old.jpg", width: 1, height: 1, aspectRatio: 1 } as ImageMetadata;
    expect(findDeletedKeys({ [legacy.key]: legacy }, s3Keys)).toEqual([legacy.key]);
  });
});

describe("findNotUploadedKeys", () => {
  it("lists entries kept because they were never uploaded", () => {
    expect(findNotUploadedKeys(metadataFile(), s3Keys)).toEqual([notUploadedYet]);
  });
});

describe("applyS3Sync", () => {
  it("removes taken-down photos and keeps the alt text of photos not uploaded yet", () => {
    const metadata = metadataFile();
    const result = applyS3Sync(metadata, {
      s3Keys,
      deletedKeys: findDeletedKeys(metadata, s3Keys),
      additions: [entry(newInS3, true)],
    });

    expect(result).toEqual({ removed: 1, added: 1, marked: 1 });
    expect(metadata[takenDown]).toBeUndefined();
    expect(metadata[notUploadedYet]).toEqual(
      entry(notUploadedYet, false, "A river at dusk, written before upload"),
    );
    expect(metadata[live]).toEqual(entry(live, true, "Milky Way over the salt flat"));
    expect(metadata[newInS3]).toEqual(entry(newInS3, true));
  });

  it("marks entries uploaded by drift:fix as uploaded, so a later takedown removes them", () => {
    const metadata = metadataFile();
    applyS3Sync(metadata, { s3Keys, deletedKeys: [], additions: [] });
    expect(metadata[uploadedByDrift]).toEqual(entry(uploadedByDrift, true, "A red wooden door"));

    const afterTakedown = new Set([live]);
    applyS3Sync(metadata, {
      s3Keys: afterTakedown,
      deletedKeys: findDeletedKeys(metadata, afterTakedown),
      additions: [],
    });
    expect(metadata[uploadedByDrift]).toBeUndefined();
    expect(metadata[notUploadedYet]).toBeDefined();
  });

  it("keeps an entry the watcher re-added as not uploaded while the sync ran", () => {
    const snapshot = metadataFile();
    const deletedKeys = findDeletedKeys(snapshot, s3Keys);

    // Fresh read at save time: the file came back locally in between.
    const onDisk = metadataFile();
    onDisk[takenDown] = entry(takenDown, false);
    const result = applyS3Sync(onDisk, { s3Keys, deletedKeys, additions: [] });

    expect(result.removed).toBe(0);
    expect(onDisk[takenDown]).toEqual(entry(takenDown, false));
  });

  it("merges an addition into an entry that appeared during the sync", () => {
    const metadata: MetadataFile = { [newInS3]: entry(newInS3, false, "A gold temple roof") };
    applyS3Sync(metadata, { s3Keys, deletedKeys: [], additions: [entry(newInS3, true)] });
    expect(metadata[newInS3]).toEqual(entry(newInS3, true, "A gold temple roof"));
  });
});
