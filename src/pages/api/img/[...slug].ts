import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
/**
 * Local image resize + cache — the dev-time replacement for the
 * CloudFront → ImgTransformationStack Lambda pipeline.
 *
 * URL shape (matches prod):   /api/img/<key-without-ext>/<width>.webp
 * Example:                     /api/img/assets/blog/colombia-2024/sad-art/1080.webp
 *
 * Architecture:
 *   - Source bucket: the local AWS SDK v3 mock serves a bucket directory whose
 *     assets folder is symlinked to Obsidian. No asset bytes are duplicated.
 *     Prod uses real S3 for this; dev uses the local mock. Code is identical.
 *
 *   - Resized bucket: mock-backed writable directory. Populated via S3
 *     PUT on cache misses. Persistent between dev runs, inspectable on disk,
 *     and queryable via the drift tool.
 *
 * Flow:
 *   1. Parse URL → derive source key + requested width.
 *   2. Fast path: if the resized bucket already has this variant, stream it.
 *   3. Miss: GET source from the local mock, resize with sharp, PUT variant
 *      back to the mock, stream the response.
 *
 * Only runs when NEXT_PUBLIC_IMAGE_BACKEND=local. In prod it's dead code.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import { createS3Client } from "src/lib/aws";
import { imageSizes } from "src/lib/mapToImageProps";

const SOURCE_BUCKET = "images.trebeljahr.com";
const RESIZED_BUCKET = "images.trebeljahr.com.resized";

// Hybrid fallback: if the source image isn't on disk locally, fall back to
// the deployed CloudFront URL. Lets dev keep working when only some images
// are synced locally (common when switching branches / sparse Notes).
const CLOUDFRONT_ID = process.env.NEXT_PUBLIC_CLOUDFRONT_ID;
const ALLOW_CLOUDFRONT_FALLBACK =
  process.env.IMAGE_FALLBACK_CLOUDFRONT !== "false" && Boolean(CLOUDFRONT_ID);

// One shared client per process. In local-dev mode this is the file-backed
// mock client; in endpoint/cloud mode createS3Client keeps the old AWS path.
const client = createS3Client();

const SOURCE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

type ByteArrayBody = {
  transformToByteArray(): Promise<Uint8Array>;
};

function hasTransformToByteArray(value: unknown): value is ByteArrayBody {
  if (!value || typeof value !== "object") return false;
  const maybeBody = value as { transformToByteArray?: unknown };
  return typeof maybeBody.transformToByteArray === "function";
}

function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  return (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown";
}

async function streamToBuffer(stream: NodeJS.ReadableStream | Blob | unknown) {
  if (stream instanceof Blob) {
    return Buffer.from(await stream.arrayBuffer());
  }
  if (hasTransformToByteArray(stream)) {
    return Buffer.from(await stream.transformToByteArray());
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
  } catch (error: unknown) {
    const status = httpStatus(error);
    if (status === 404 || status === 403) return false;
    throw error;
  }
}

/**
 * Try each common image extension against the source bucket. Once found,
 * return the raw bytes. Matches how the prod Lambda resolves ext-less
 * CloudFront URLs back to stored objects.
 */
async function readSource(logicalKey: string): Promise<Buffer | null> {
  for (const ext of SOURCE_EXTS) {
    const candidate = `${logicalKey}.${ext}`;
    try {
      const r = await client.send(new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: candidate }));
      if (!r.Body) continue;
      return await streamToBuffer(r.Body);
    } catch (error: unknown) {
      const status = httpStatus(error);
      if (status === 404 || status === 403) continue;
      throw error;
    }
  }
  return null;
}

async function readResized(key: string): Promise<Buffer> {
  const r = await client.send(new GetObjectCommand({ Bucket: RESIZED_BUCKET, Key: key }));
  if (!r.Body) throw new Error("empty body");
  return streamToBuffer(r.Body);
}

async function writeResized(key: string, body: Buffer): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: RESIZED_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
    }),
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
  const width = Number.parseInt(match[1], 10);
  if (!imageSizes.includes(width)) return null;
  const logicalKey = slug.slice(0, -1).join("/");
  const variantKey = `${logicalKey}/${last}`;
  return { variantKey, logicalKey, width };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      // Hybrid fallback: proxy the deployed CloudFront variant. Logs once
      // per miss so you know which images still need to be uploaded.
      if (ALLOW_CLOUDFRONT_FALLBACK) {
        const cfUrl = `https://${CLOUDFRONT_ID}.cloudfront.net/${variantKey}`;
        const upstream = await fetch(cfUrl);
        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          res.setHeader("Content-Type", "image/webp");
          res.setHeader("X-Image-Cache", "CLOUDFRONT-FALLBACK");
          res.setHeader("Cache-Control", "public, max-age=3600");
          console.warn(`[/api/img] local miss, served from CloudFront: ${logicalKey}`);
          res.status(200).send(buf);
          return;
        }
        console.warn(`[/api/img] local miss AND CloudFront ${upstream.status}: ${logicalKey}`);
      }
      res.status(404).send(`source not found for ${logicalKey}`);
      return;
    }
    const pipeline = sharp(source, { animated: true })
      .resize(width, undefined, { withoutEnlargement: true })
      .webp({ quality: 82 });
    const output = await pipeline.toBuffer();

    // 3. Write-through cache, then respond.
    await writeResized(variantKey, output).catch((error) => {
      console.warn(`[/api/img] failed to cache ${variantKey}:`, errorMessage(error));
    });

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("X-Image-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.status(200).send(output);
  } catch (error: unknown) {
    console.error(`[/api/img] error for ${variantKey}:`, error);
    res.status(500).send(`image pipeline error: ${errorMessage(error)}`);
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};
