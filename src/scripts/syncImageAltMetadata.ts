/**
 * Alt-text sync.
 *
 * Single source of truth: src/content/Notes/_data/metadata.json.
 * Each entry carries width/height/aspectRatio/existsInS3 plus `alt` and
 * `altSource` ("manual" | "generated" | "ai"). Callers read alt from the
 * same file via src/lib/imageAlt.ts.
 *
 * Inputs:
 *   - Without flags: fills missing alts with filename-derived defaults
 *     (altSource="generated"). Photography is skipped unless
 *     --include-photography is passed.
 *   - --from-staging <dir>: merges JSON files produced by the alt-text
 *     subagents. Each staging file is a flat {key: alt} map; every entry
 *     is written with altSource="ai" UNLESS the existing entry is "manual"
 *     (manual wins).
 */
import "dotenv/config";
import { readFile, writeFile, readdir } from "fs/promises";
import { resolve, join } from "path";
import { cwd, argv } from "process";

const METADATA_PATH = resolve(
  cwd(),
  "src/content/Notes/_data/metadata.json",
);

const INCLUDE_PHOTOGRAPHY = argv.includes("--include-photography");
const STAGING_FLAG_INDEX = argv.indexOf("--from-staging");
const STAGING_DIR =
  STAGING_FLAG_INDEX >= 0 ? argv[STAGING_FLAG_INDEX + 1] : null;

type AltSource = "manual" | "generated" | "ai";
type MetadataEntry = {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
  alt?: string;
  altSource?: AltSource;
};
type Metadata = Record<string, MetadataEntry>;

function altFromKey(key: string): string {
  const last = key.split("/").pop() || "";
  const noExt = last.replace(/\.[a-zA-Z0-9]+$/, "");
  const words = noExt.replace(/[-_]+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

async function loadStagingMaps(dir: string): Promise<Record<string, string>> {
  const files = (await readdir(dir)).filter(
    (f) => f.startsWith("out-") && f.endsWith(".json"),
  );
  const merged: Record<string, string> = {};
  for (const f of files) {
    const raw = await readFile(join(dir, f), "utf8");
    try {
      const data = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === "string" && v.trim().length > 0) merged[k] = v.trim();
      }
    } catch (e) {
      console.warn(`  skipping malformed ${f}:`, (e as Error).message);
    }
  }
  return merged;
}

async function main() {
  const meta = JSON.parse(await readFile(METADATA_PATH, "utf8")) as Metadata;

  const aiAlts = STAGING_DIR ? await loadStagingMaps(STAGING_DIR) : {};
  let aiApplied = 0;
  let generatedAdded = 0;
  let skippedPhotography = 0;

  for (const key of Object.keys(meta)) {
    const entry = meta[key];
    if (!entry) continue;
    const isManual = entry.altSource === "manual";

    // 1. Apply AI-generated alt (subagent output) unless this entry is manual
    if (!isManual && aiAlts[key]) {
      entry.alt = aiAlts[key];
      entry.altSource = "ai";
      aiApplied++;
      continue;
    }

    // 2. Skip photography unless forced, and skip entries that already have alt
    if (entry.alt) continue;
    if (!INCLUDE_PHOTOGRAPHY && key.startsWith("assets/photography/")) {
      skippedPhotography++;
      continue;
    }

    // 3. Fill in filename-derived default
    const generated = altFromKey(key);
    if (!generated) continue;
    entry.alt = generated;
    entry.altSource = "generated";
    generatedAdded++;
  }

  await writeFile(METADATA_PATH, JSON.stringify(meta, null, 2) + "\n");

  const withAlt = Object.values(meta).filter((e) => e?.alt).length;
  console.log(
    `syncImageAlt: +${aiApplied} from AI, +${generatedAdded} filename defaults; ` +
      `${withAlt}/${Object.keys(meta).length} entries have alt` +
      (INCLUDE_PHOTOGRAPHY
        ? ""
        : ` (skipped ${skippedPhotography} photography entries; pass --include-photography to force)`),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
