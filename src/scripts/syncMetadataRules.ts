/**
 * What `npm run syncMetadata` changes in metadata.json, kept apart from the
 * script so it can be tested without S3.
 *
 * S3 decides what the site shows: the galleries and the random photo list
 * metadata.json keys, so an entry whose object was deleted from the bucket
 * would show a broken image. The sync removes those entries. An entry that was
 * never uploaded (`existsInS3: false`, added by the asset watcher or
 * backfillLocalMetadata) is waiting for its upload, not deleted, so it stays
 * with its alt text.
 */
import type { ImageMetadata, MetadataFile } from "../lib/metadataJsonFile";

/** Entries that were uploaded once and whose object is gone from S3 now. */
export function findDeletedKeys(metadata: MetadataFile, s3Keys: ReadonlySet<string>): string[] {
  return Object.keys(metadata).filter(
    (key) => !s3Keys.has(key) && metadata[key]?.existsInS3 !== false,
  );
}

/** Entries the sync keeps although S3 does not have them: never uploaded. */
export function findNotUploadedKeys(metadata: MetadataFile, s3Keys: ReadonlySet<string>): string[] {
  return Object.keys(metadata).filter(
    (key) => !s3Keys.has(key) && metadata[key]?.existsInS3 === false,
  );
}

/**
 * Applies a sync to a fresh read of metadata.json, in place:
 * - deletes `deletedKeys`, unless the entry is marked as never uploaded now;
 * - merges `additions` (S3 objects that had no entry) into the file;
 * - marks every entry found in S3 as uploaded. drift:fix uploads without
 *   touching metadata.json, so its entries say `existsInS3: false` until a
 *   sync sees them in the bucket.
 */
export function applyS3Sync(
  metadata: MetadataFile,
  sync: { s3Keys: ReadonlySet<string>; deletedKeys: string[]; additions: ImageMetadata[] },
): { removed: number; added: number; marked: number } {
  let removed = 0;
  for (const key of sync.deletedKeys) {
    const entry = metadata[key];
    if (!entry || entry.existsInS3 === false) continue;
    delete metadata[key];
    removed++;
  }

  for (const entry of sync.additions) {
    metadata[entry.key] = { ...metadata[entry.key], ...entry };
  }

  let marked = 0;
  for (const [key, entry] of Object.entries(metadata)) {
    if (!entry || entry.existsInS3 === true || !sync.s3Keys.has(key)) continue;
    entry.existsInS3 = true;
    marked++;
  }

  return { removed, added: sync.additions.length, marked };
}
