/**
 * Build-time loading for the public needlestack pages.
 *
 * Split from `public.ts` because this reads the filesystem: pages import the
 * pure half at the top level and this half inside getStaticProps only, the way
 * the rest of the site loads its content.
 */

import type { PublicNeedle } from "./public";
import { orderForPath, publicNeedles } from "./public";
import { readNeedles, readPaths } from "./store";
import type { DoorId, PathId } from "./taxonomy";
import { pathsInDoor } from "./taxonomy";

export const loadPublicNeedles = async (): Promise<PublicNeedle[]> =>
  publicNeedles(await readNeedles());

/** One path as a page renders it: its curated intro, and its needles in order. */
export type PathSection = {
  id: PathId;
  title: string;
  blurb: string;
  intro?: string;
  needles: PublicNeedle[];
};

/** Every path in a door, empty ones included: the door page is a map of intents. */
export const loadDoorSections = async (door: DoorId): Promise<PathSection[]> => {
  const [needles, curation] = await Promise.all([loadPublicNeedles(), readPaths()]);
  return pathsInDoor(door).map((path) => {
    const own = curation[path.id];
    return {
      id: path.id,
      title: path.title,
      blurb: path.blurb,
      ...(own?.intro ? { intro: own.intro } : {}),
      needles: orderForPath(needles, path.id, own?.order),
    };
  });
};
