import { loadVeliteData } from "src/lib/loadVeliteData";

type BacklinkEntry = {
  title: string;
  link: string;
  type: string;
};

type BacklinksMap = Record<string, BacklinkEntry[]>;

let cachedBacklinks: BacklinksMap | null = null;

function loadBacklinks(): BacklinksMap {
  if (cachedBacklinks) return cachedBacklinks;
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
