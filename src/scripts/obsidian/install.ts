// pnpm obsidian:install [vault] — copies the repo's Obsidian plugins into the
// Notes vault and turns them on. The vault's .obsidian folder is gitignored, so
// this repo keeps the source. Rerun after changing a plugin, then run "Reload app
// without saving" in Obsidian.
//
// Desk also gets its word history once: what /dev/writing collected so far, from
// .writing-progress.json in the current folder, unless the vault already has it.

import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { seedFromHistory, WORDS_SEED_REL } from "./desk/deskStore";

const SOURCE = path.join("src", "scripts", "obsidian");
const vault = process.argv[2] ?? path.join("src", "content", "Notes");
const obsidian = path.join(vault, ".obsidian");

if (!fs.existsSync(obsidian)) {
  throw new Error(`No Obsidian vault at ${vault} (missing .obsidian)`);
}

function copyComponents(target: string) {
  const source = path.join(SOURCE, "ricos-site-components");
  for (const file of ["main.js", "manifest.json"]) {
    fs.copyFileSync(path.join(source, file), path.join(target, file));
  }
}

async function buildDesk(target: string) {
  const source = path.join(SOURCE, "desk");
  await build({
    entryPoints: [path.join(source, "main.ts")],
    outfile: path.join(target, "main.js"),
    bundle: true,
    format: "cjs",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    minify: true,
    // Obsidian provides this at runtime; the plugin must not bundle it.
    external: ["obsidian"],
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
  for (const file of ["manifest.json", "styles.css"]) {
    fs.copyFileSync(path.join(source, file), path.join(target, file));
  }
}

function seedDeskWords() {
  const seed = path.join(vault, WORDS_SEED_REL);
  const history = ".writing-progress.json";
  if (fs.existsSync(seed) || !fs.existsSync(history)) return;
  const words = JSON.parse(fs.readFileSync(history, "utf8")) as Record<string, number>;
  fs.writeFileSync(seed, `${JSON.stringify(seedFromHistory(words), undefined, 2)}\n`);
  console.log(`Seeded Desk's word history in ${seed}.`);
}

const PLUGINS: Record<string, (target: string) => void | Promise<void>> = {
  "ricos-site-components": copyComponents,
  desk: buildDesk,
};

const enabledFile = path.join(obsidian, "community-plugins.json");
const enabled: string[] = fs.existsSync(enabledFile)
  ? JSON.parse(fs.readFileSync(enabledFile, "utf8"))
  : [];

for (const [id, install] of Object.entries(PLUGINS)) {
  const target = path.join(obsidian, "plugins", id);
  fs.mkdirSync(target, { recursive: true });
  await install(target);
  if (!enabled.includes(id)) enabled.push(id);
  console.log(`Installed ${id} into ${target}.`);
}
fs.writeFileSync(enabledFile, `${JSON.stringify(enabled, undefined, 2)}\n`);
seedDeskWords();
console.log("Reload Obsidian to pick them up.");
