import fs from "node:fs";
import path from "node:path";

const metadataPath = "src/content/Notes/_data/metadata.json";
const assetsRoot = "src/content/Notes/assets";

const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
const metadataKeys = new Set(Object.keys(metadata));

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, filelist);
    } else {
      if (/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
}

const diskFiles = walk(assetsRoot);
const missingInMetadata = [];

for (const file of diskFiles) {
  const key = "assets/" + path.relative(assetsRoot, file);
  if (!metadataKeys.has(key)) {
    missingInMetadata.push(key);
  }
}

console.log(`Total images on disk: ${diskFiles.length}`);
console.log(`Missing in metadata: ${missingInMetadata.length}`);
if (missingInMetadata.length > 0) {
  console.log("First 20 missing:");
  console.log(missingInMetadata.slice(0, 20).join("\n"));
}

const metadataOnly = [];
for (const key of metadataKeys) {
  if (key.startsWith("assets/")) {
    const diskPath = path.join(assetsRoot, key.replace("assets/", ""));
    if (!fs.existsSync(diskPath)) {
      metadataOnly.push(key);
    }
  }
}

console.log(`\nMetadata keys with no file on disk: ${metadataOnly.length}`);
if (metadataOnly.length > 0) {
  console.log("First 20 stale:");
  console.log(metadataOnly.slice(0, 20).join("\n"));
}
