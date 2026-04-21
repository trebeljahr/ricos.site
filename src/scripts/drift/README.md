# Drift tooling

Three stores need to agree for the image pipeline to behave:

1. **Local Obsidian assets** — `src/content/Notes/assets/**` (filesystem,
   gitignored in the Notes submodule, Obsidian-editable)
2. **Source S3 bucket** — `images.trebeljahr.com` (authoritative for photos
   that are listed dynamically, like `photography/` and `midjourney-gallery/`)
3. **Transformed S3 bucket** — `images.trebeljahr.com.resized` (written by
   the `ImgTransformationStack` Lambda, served via CloudFront as
   `<key-without-ext>/<width>.webp`)

Drift accumulates over time:

- Files deleted locally but not in the bucket (takedown requests, copyright
  cleanups, renames).
- Files in the bucket never referenced by any MD/MDX (stale uploads from
  phone-camera originals whose slugged copy later replaced them).
- Resized variants left over for source keys that no longer exist.
- Content duplicates — the same image uploaded as both `blog/<slug>.jpg`
  and `photography/<topic>/<slug>.jpg`.

## Commands

```bash
npm run drift:check      # read-only report, no mutations
npm run drift:fix        # interactive reconciliation (prompts before each step)
npm run drift:fix -- -y  # auto-confirm all prompts (CI / headless use)
```

`drift:check` is safe to run as often as you like — it hits the S3 API
(two LIST calls) and hashes local files but never writes.

`drift:fix` walks four steps in order, asking `y/n` before each:

1. **local → source upload** of files that exist locally but not in the
   bucket.
2. **source → local download** of files missing locally (excluding the
   dynamic `photography/` and `midjourney-gallery/` folders, which are
   large and usually managed separately).
3. **consolidate content dupes** — finds blog-asset files whose content
   matches a `photography/` file. Renames the photography file to the
   blog slug (if needed), rewrites every MDX reference, then deletes the
   blog copy from both local and source.
4. **resized orphan cleanup** — deletes variants in the resized bucket
   whose source key no longer exists.

Each step re-scans state so later steps see the result of earlier ones.

## Notes

- ETags in the source bucket are raw MD5 (no multipart uploads), which is
  why `check.ts` can do content-dupe detection without downloading
  anything.
- The dynamic folders (`assets/photography/`, `assets/midjourney-gallery/`,
  `favicon/`) are excluded from "unreferenced" checks — they're loaded at
  runtime via S3 listing, not via MD/MDX references.
- If the photography gallery folder is missing locally and you want to
  manage it in Obsidian, run
  `aws s3 sync s3://images.trebeljahr.com/assets/photography/
  src/content/Notes/assets/photography/` once. The folder is ignored by
  the Notes submodule's `.gitignore` so it never enters version control.
