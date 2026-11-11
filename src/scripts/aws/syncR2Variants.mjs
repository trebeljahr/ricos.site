// Fill in the next/image variants R2 is missing, so assets.ricos.site serves
// every image the site references.
//
// CloudFront made variants on demand (a Lambda on 404); R2 cannot, so every
// deploy runs this first (.github/workflows/deploy.yml, job `images`). It
// lists the originals in the S3 source bucket and the variants in R2, and
// writes `<key without extension>/<width>.webp` for each source that does not
// have all 16 widths yet. Usually nothing is missing and it finishes in about
// a minute of listing.
//
// Same pipeline as the image Lambda and src/pages/api/img:
//   sharp(src, { animated: true }).resize(w, undefined, { withoutEnlargement: true }).webp({ quality: 82 })
// Widths at or above the original's width encode once and reuse the bytes.
// When sharp cannot read a source (some AVIF files), the variants are copied
// from CloudFront instead, which still serves them.
//
// Env (from .env.production via dotenvx): AWS_ACCESS_KEY_ID,
// AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME (source),
// R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, NEXT_PUBLIC_CLOUDFRONT_ID.
// R2_BUCKET defaults to ricos-site-assets. Exits 1 if any source fails.
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
const SOURCE_BUCKET = process.env.AWS_BUCKET_NAME;
const R2_BUCKET = process.env.R2_BUCKET || "ricos-site-assets";
const CLOUDFRONT = process.env.NEXT_PUBLIC_CLOUDFRONT_ID
  ? `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net`
  : "";

const src = new S3Client({ region: process.env.AWS_REGION });
const dst = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
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
  return dst.send(
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
  const r = await src.send(new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: key }));
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

async function copyFromCloudFront(base) {
  if (!CLOUDFRONT) throw new Error("no NEXT_PUBLIC_CLOUDFRONT_ID to copy from");
  for (const w of WIDTHS) {
    const r = await fetch(`${CLOUDFRONT}${encodeURI(`/${base}/${w}.webp`)}`);
    if (!r.ok) throw new Error(`CloudFront answered ${r.status} for width ${w}`);
    await put(`${base}/${w}.webp`, Buffer.from(await r.arrayBuffer()));
  }
}

if (!SOURCE_BUCKET || !process.env.R2_ENDPOINT) {
  console.error("AWS_BUCKET_NAME and R2_ENDPOINT must be set (run through dotenvx).");
  process.exit(1);
}

const sources = (await listAll(src, SOURCE_BUCKET, "assets/")).filter((k) => EXTS.test(k));
const have = new Map();
for (const k of await listAll(dst, R2_BUCKET, "assets/")) {
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
        try {
          await encode(key, base);
        } catch (e) {
          console.log(`sharp failed on ${key} (${e.message}), copying from CloudFront`);
          await copyFromCloudFront(base);
        }
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
