import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { createS3Client } from "src/lib/aws";

export interface S3Object {
  Key: string;
  ETag: string;
  Size: number;
}

/**
 * List every object in a bucket (paginated, full scan).
 * Returns Key, ETag (MD5 for single-part uploads), and Size.
 */
export async function listAllObjects(
  bucket: string,
  prefix = ""
): Promise<S3Object[]> {
  const client = createS3Client();
  const out: S3Object[] = [];
  let token: string | undefined = undefined;
  do {
    const resp: any = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const obj of resp.Contents ?? []) {
      if (!obj.Key) continue;
      out.push({
        Key: obj.Key,
        ETag: (obj.ETag ?? "").replaceAll('"', ""),
        Size: obj.Size ?? 0,
      });
    }
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/**
 * Batched delete via DeleteObjects (max 1000 per request).
 * Progress callback fires after each batch completes.
 */
export async function deleteObjects(
  bucket: string,
  keys: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ deleted: number; errors: { Key: string; Message?: string }[] }> {
  const client = createS3Client();
  const errors: { Key: string; Message?: string }[] = [];
  let done = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const resp = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
    for (const e of resp.Errors ?? []) {
      if (e.Key) errors.push({ Key: e.Key, Message: e.Message });
    }
    done += batch.length;
    onProgress?.(done, keys.length);
  }
  return { deleted: keys.length - errors.length, errors };
}

/**
 * Server-side rename: copy old → new, delete old.
 */
export async function renameObject(
  bucket: string,
  oldKey: string,
  newKey: string
): Promise<void> {
  const client = createS3Client();
  const { CopyObjectCommand, DeleteObjectCommand } = await import(
    "@aws-sdk/client-s3"
  );
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${encodeURIComponent(oldKey)}`,
      Key: newKey,
      MetadataDirective: "COPY",
    })
  );
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }));
}
