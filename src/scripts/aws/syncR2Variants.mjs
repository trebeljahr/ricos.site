// Fill in the next/image variants R2 is missing, so assets.ricos.site serves
// every image the site references.
//
// CloudFront made variants on demand (a Lambda on 404); R2 cannot, so every
// deploy runs this first (.github/workflows/deploy.yml, job `images`). It
// lists the originals in the private R2 bucket and the variants in the
// public one, and
// writes `<key without extension>/<width>.webp` for each source that does not
// have all 16 widths yet. Usually nothing is missing and it finishes in about
// a minute of listing.
//
// Same pipeline as the image Lambda and src/pages/api/img:
//   sharp(src, { animated: true }).resize(w, undefined, { withoutEnlargement: true }).webp({ quality: 82 })
// Widths at or above the original's width encode once and reuse the bytes.
// A source sharp cannot read fails the run; add its variants by hand.
//
// Env (from .env.production via dotenvx): R2_ENDPOINT, IMAGES_R2_ACCESS_KEY_ID,
// IMAGES_R2_SECRET_ACCESS_KEY (one key for both buckets). Bucket names
// default to ricos-site-originals and ricos-site-assets. Exits 1 if any
// source fails.
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const SOURCE_BUCKET = process.env.ORIGINALS_BUCKET || "ricos-site-originals";
const R2_BUCKET = process.env.VARIANTS_BUCKET || "ricos-site-assets";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.IMAGES_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.IMAGES_R2_SECRET_ACCESS_KEY,
  },
});
sharp.concurrency(1);

async function listAll(client, Bucket, Prefix) {
  const out = [];
  let ContinuationToken;
  do {
    const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken }));
    for (const o of r.Contents ?? []) out.push(o.Key);
    ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return out;
}

function put(key, body) {
  return r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: CACHE_CONTROL,
    }),
  );
}

async function encode(key, base) {
  const r = await r2.send(new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: key }));
  const input = Buffer.from(await r.Body.transformToByteArray());
  const origW = (await sharp(input, { animated: true }).metadata()).width ?? 0;
  let capped;
  for (const w of WIDTHS) {
    let body;
    if (origW && w >= origW && capped) body = capped;
    else {
      body = await sharp(input, { animated: true })
        .resize(w, undefined, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      if (origW && w >= origW) capped = body;
    }
    await put(`${base}/${w}.webp`, body);
  }
}

if (!process.env.R2_ENDPOINT || !process.env.IMAGES_R2_ACCESS_KEY_ID) {
  console.error("R2_ENDPOINT and IMAGES_R2_* must be set (run through dotenvx).");
  process.exit(1);
}

const sources = (await listAll(r2, SOURCE_BUCKET, "assets/")).filter((k) => EXTS.test(k));
const have = new Map();
for (const k of await listAll(r2, R2_BUCKET, "assets/")) {
  const base = k.slice(0, k.lastIndexOf("/"));
  have.set(base, (have.get(base) ?? 0) + 1);
}
const todo = sources.filter((k) => (have.get(k.replace(EXTS, "")) ?? 0) < WIDTHS.length);
console.log(`${sources.length} sources, ${todo.length} missing variants in R2`);

let failed = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: Number(process.env.JOBS || 4) }, async () => {
    while (queue.length) {
      const key = queue.shift();
      const base = key.replace(EXTS, "");
      try {
        await encode(key, base);
        console.log(`ok ${key}`);
      } catch (e) {
        failed++;
        console.log(`FAIL ${key}: ${e.message}`);
      }
    }
  }),
);
console.log(`done: ${todo.length - failed} written, ${failed} failed`);
if (failed) process.exit(1);
