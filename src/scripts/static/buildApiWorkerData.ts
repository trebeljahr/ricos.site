/**
 * The data the API Worker (workers/api) bundles: what the Next routes read
 * from the checkout at runtime, read once here instead. Written to
 * workers/api/generated/api-data.json (gitignored); the deploy rebuilds it
 * from the same Notes commit as the pages.
 *
 *   tsx src/scripts/static/buildApiWorkerData.ts
 *
 * - quotes: /api/quote's pool, the short quotes of /quotes, authors cleaned
 *   (src/pages/api/quote.ts).
 * - photos: /api/random-photo's pool, every photo in a trip gallery
 *   (src/pages/api/random-photo.ts).
 * - confirmTemplate: the double-opt-in email's template source.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { getLocalMetadata, isHiddenPhoto, photographyFolder } from "src/lib/imageMetadata";
import { readConfirmTemplate } from "src/lib/newsletter/subscribe";
import { cleanAuthor } from "src/lib/quotePortraits";
import { gallerySlugOfKey } from "src/lib/utils/gallerySlug";
import type { ApiData } from "../../../workers/api/src/router";

/** Short enough to read in a speech bubble on a phone (the same limit as quote.ts). */
const MAX_QUOTE_LENGTH = 200;
const IMAGE_PATTERN = /\.(jpg|jpeg|png|webp|gif|avif)$/i;

const OUT = resolve("workers/api/generated/api-data.json");

async function main() {
  const raw = JSON.parse(
    readFileSync(join("src", "content", "Notes", "pages", "quotes.json"), "utf-8"),
  ) as { content?: string; author?: string }[];
  const quotes = raw
    .filter(({ content, author }) => author && content && content.length <= MAX_QUOTE_LENGTH)
    .map(({ content, author }) => ({
      content: content as string,
      author: cleanAuthor(author as string),
    }));

  const photos = Object.keys(getLocalMetadata())
    .filter(
      (key) => key.startsWith(photographyFolder) && IMAGE_PATTERN.test(key) && !isHiddenPhoto(key),
    )
    .map((key) => ({ src: `/${key}`, tripName: gallerySlugOfKey(key) }));

  if (quotes.length === 0) throw new Error("no quotes found for /api/quote");
  if (photos.length === 0) throw new Error("no photos found for /api/random-photo");

  const data: ApiData = { quotes, photos, confirmTemplate: await readConfirmTemplate() };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(data));
  console.log(
    `[api-data] ${quotes.length} quotes, ${photos.length} photos -> ${OUT.replace(`${process.cwd()}/`, "")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
