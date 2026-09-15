import { loadVeliteData } from "src/lib/loadVeliteData";

type BacklinkEntry = {
  title: string;
  link: string;
  type: string;
};

type BacklinksMap = Record<string, BacklinkEntry[]>;

let cachedBacklinks: BacklinksMap | null = null;

function loadBacklinks(): BacklinksMap {
  // Dev regenerates backlinks.json after content edits, and this module can
  // outlive the change, so only cache in production.
  if (cachedBacklinks && process.env.NODE_ENV !== "development") return cachedBacklinks;
  try {
    cachedBacklinks = loadVeliteData<BacklinksMap>("backlinks.json");
  } catch {
    cachedBacklinks = {};
  }
  return cachedBacklinks;
}

export function getBacklinks(link: string): BacklinkEntry[] {
  const backlinks = loadBacklinks();
  return backlinks[link] || [];
}
