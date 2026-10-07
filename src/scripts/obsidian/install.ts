// pnpm obsidian:install — copies the ricos.site components plugin into the
// Notes vault and turns it on. The vault's .obsidian folder is gitignored, so
// this repo keeps the source. Rerun after changing the plugin, then run
// "Reload app without saving" in Obsidian.

import fs from "node:fs";
import path from "node:path";

const PLUGIN_ID = "ricos-site-components";
const source = path.join("src", "scripts", "obsidian", PLUGIN_ID);
const vault = process.argv[2] ?? path.join("src", "content", "Notes");
const obsidian = path.join(vault, ".obsidian");

if (!fs.existsSync(obsidian)) {
  throw new Error(`No Obsidian vault at ${vault} (missing .obsidian)`);
}

const target = path.join(obsidian, "plugins", PLUGIN_ID);
fs.mkdirSync(target, { recursive: true });
for (const file of ["main.js", "manifest.json"]) {
  fs.copyFileSync(path.join(source, file), path.join(target, file));
}

const enabledFile = path.join(obsidian, "community-plugins.json");
const enabled: string[] = fs.existsSync(enabledFile)
  ? JSON.parse(fs.readFileSync(enabledFile, "utf8"))
  : [];
if (!enabled.includes(PLUGIN_ID)) {
  fs.writeFileSync(enabledFile, `${JSON.stringify([...enabled, PLUGIN_ID], undefined, 2)}\n`);
}
console.log(`Installed ${PLUGIN_ID} into ${target}. Reload Obsidian to pick it up.`);
