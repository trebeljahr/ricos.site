/**
 * Local image resize + cache — the dev-time replacement for the
 * CloudFront → ImgTransformationStack Lambda pipeline.
 *
 * URL shape (matches prod):   /api/img/<key-without-ext>/<width>.webp
 * Example:                     /api/img/assets/blog/colombia-2024/sad-art/1080.webp
 *
 * Architecture:
 *   - Source bucket: rclone serves the Obsidian assets folder (symlinked
 *     under .rclone-data/) as an S3 endpoint. No duplication — every file
 *     on disk IS the S3 object. Prod uses real S3 for this; dev uses
 *     rclone. Code is identical.
 *
 *   - Resized bucket: rclone-backed writable directory. Populated via S3
 *     PUT on cache misses. Persistent between dev runs, inspectable via
 *     any S3 browser, queryable via the drift tool.
 *
 * Flow:
 *   1. Parse URL → derive source key + requested width.
 *   2. Fast path: if the resized bucket already has this variant, stream it.
 *   3. Miss: GET source from rclone, resize with sharp, PUT variant to
 *      rclone, stream the response.
 *
 * Only runs when NEXT_PUBLIC_IMAGE_BACKEND=local. In prod it's dead code.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { imageSizes } from "src/lib/mapToImageProps";

const SOURCE_BUCKET = "images.trebeljahr.com";
const RESIZED_BUCKET = "images.trebeljahr.com.resized";

const ENDPOINT =
  process.env.S3_ENDPOINT ??
  `http://localhost:${process.env.S3_API_PORT ?? "9200"}`;

// One shared client per process. When S3_ENDPOINT is set we're in local-dev
// mode — use MinIO credentials (from S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY,
// defaulting to minioadmin/minioadmin). DO NOT fall through to AWS_* in local
// mode: .env typically contains real AWS credentials which rclone would reject.
const client = new S3Client({
  region: process.env.AWS_REGION ?? "eu-west-2",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
  },
  forcePathStyle: true,
});

const SOURCE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

async function streamToBuffer(stream: NodeJS.ReadableStream | Blob | unknown) {
  if (stream instanceof Blob) {
    return Buffer.from(await stream.arrayBuffer());
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function bucketHas(bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e: any) {
    const status = e?.$metadata?.httpStatusCode;
    if (status === 404 || status === 403) return false;
    throw e;
  }
}

/**
 * Try each common image extension against the source bucket. Once found,
 * return the raw bytes. Matches how the prod Lambda resolves ext-less
 * CloudFront URLs back to stored objects.
 */
async function readSource(
  logicalKey: string
): Promise<Buffer | null> {
  for (const ext of SOURCE_EXTS) {
    const candidate = `${logicalKey}.${ext}`;
    try {
      const r = await client.send(
        new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: candidate })
      );
      if (!r.Body) continue;
      return await streamToBuffer(r.Body as any);
    } catch (e: any) {
      const status = e?.$metadata?.httpStatusCode;
      if (status === 404 || status === 403) continue;
      throw e;
    }
  }
  return null;
}

async function readResized(key: string): Promise<Buffer> {
  const r = await client.send(
    new GetObjectCommand({ Bucket: RESIZED_BUCKET, Key: key })
  );
  if (!r.Body) throw new Error("empty body");
  return streamToBuffer(r.Body as any);
}

async function writeResized(key: string, body: Buffer): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: RESIZED_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
    })
  );
}

function parseSlug(slug: string[] | undefined): {
  variantKey: string;
  logicalKey: string;
  width: number;
} | null {
  if (!slug || slug.length < 2) return null;
  const last = slug[slug.length - 1];
  const match = last.match(/^(\d+)\.webp$/);
  if (!match) return null;
  const width = parseInt(match[1], 10);
  if (!imageSizes.includes(width)) return null;
  const logicalKey = slug.slice(0, -1).join("/");
  const variantKey = `${logicalKey}/${last}`;
  return { variantKey, logicalKey, width };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const parsed = parseSlug(req.query.slug as string[]);
  if (!parsed) {
    res.status(400).send("bad image url");
    return;
  }
  const { variantKey, logicalKey, width } = parsed;

  try {
    // 1. Fast path: variant already cached
    if (await bucketHas(RESIZED_BUCKET, variantKey)) {
      const buf = await readResized(variantKey);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("X-Image-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.status(200).send(buf);
      return;
    }

    // 2. Cache miss: read source + transform
    const source = await readSource(logicalKey);
    if (!source) {
      res.status(404).send(`source not found for ${logicalKey}`);
      return;
    }
    const pipeline = sharp(source, { animated: true })
      .resize(width, undefined, { withoutEnlargement: true })
      .webp({ quality: 82 });
    const output = await pipeline.toBuffer();

    // 3. Write-through cache, then respond.
    await writeResized(variantKey, output).catch((err) => {
      console.warn(`[/api/img] failed to cache ${variantKey}:`, err.message);
    });

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("X-Image-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.status(200).send(output);
  } catch (e: any) {
    console.error(`[/api/img] error for ${variantKey}:`, e);
    res.status(500).send(`image pipeline error: ${e?.message ?? "unknown"}`);
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};
