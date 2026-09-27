/**
 * What the public needlestack pages are allowed to know.
 *
 * The archive holds a few thousand imported links, most of them unrated and
 * unread. `publicNeedles` is the only door out of that file: it drops
 * everything that is not `reviewed` with a rating of 1 or more, and it drops
 * the triage fields (pool, folders, status, the machine's guess) on the way,
 * because getStaticProps serialises whatever it returns into the HTML. A
 * filter in a component would leak the rest into `__NEXT_DATA__`.
 *
 * Everything here is pure so the rule can be tested without a filesystem.
 */
import type { DoorId, PathId } from "./taxonomy";
import { PATHS } from "./taxonomy";
import type { Level, Needle, NeedleType, Rating } from "./types";
import { isPublic } from "./types";

/** A reviewed needle, stripped to the fields a page renders. */
export type PublicNeedle = {
  id: string;
  url: string;
  title: string;
  type: NeedleType;
  topics: string[];
  door?: DoorId;
  paths: PathId[];
  minutes?: number;
  level?: Level;
  rating: Rating;
  /** Rico's note, as plain text: the card that shows it is itself a link. */
  note?: string;
  addedAt?: string;
};

/**
 * Notes imported from the old needlestack page are markdown fragments that
 * continue a sentence ("— I wrote about [this](/posts/x)"). The whole card is
 * one anchor, so a link inside it cannot stay a link; the leading dash only
 * made sense after a title.
 */
export const plainNote = (note: string | undefined): string | undefined => {
  if (!note) return undefined;
  const text = note
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/^\s*[-–—•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : undefined;
};

const toPublicNeedle = (needle: Needle): PublicNeedle => ({
  id: needle.id,
  url: needle.url,
  title: needle.title,
  type: needle.type,
  topics: needle.topics,
  ...(needle.door ? { door: needle.door } : {}),
  paths: needle.paths,
  ...(needle.minutes === undefined ? {} : { minutes: needle.minutes }),
  ...(needle.level ? { level: needle.level } : {}),
  rating: needle.rating,
  ...(plainNote(needle.note) ? { note: plainNote(needle.note) } : {}),
  ...(needle.addedAt ? { addedAt: needle.addedAt } : {}),
});

/** Rico's order: his rating first, then the newest, then something stable. */
export const byRating = (a: PublicNeedle, b: PublicNeedle): number =>
  b.rating - a.rating ||
  (b.addedAt ?? "").localeCompare(a.addedAt ?? "") ||
  a.title.localeCompare(b.title);

export const byRecent = (a: PublicNeedle, b: PublicNeedle): number =>
  (b.addedAt ?? "").localeCompare(a.addedAt ?? "") || byRating(a, b);

/** The publication gate. Nothing else may read needles.json for a page. */
export const publicNeedles = (needles: Needle[]): PublicNeedle[] =>
  needles.filter(isPublic).map(toPublicNeedle).sort(byRating);

const doorOfPath = new Map<string, DoorId>(PATHS.map((path) => [path.id, path.door]));

/** A needle sits in a door through its own field or through any of its paths. */
export const inDoor = (needle: PublicNeedle, door: DoorId): boolean =>
  needle.door === door || needle.paths.some((path) => doorOfPath.get(path) === door);

export const inPath = (needle: PublicNeedle, path: PathId): boolean => needle.paths.includes(path);

/**
 * Needles for one path, in the order from paths.json. Ids that file does not
 * mention (or mentions but no longer publishes) fall back to `byRating`, so a
 * path renders sensibly before anyone has hand-ordered it.
 */
export const orderForPath = (
  needles: PublicNeedle[],
  path: PathId,
  order: string[] = [],
): PublicNeedle[] => {
  const inThisPath = needles.filter((needle) => inPath(needle, path));
  const rank = new Map(order.map((id, index) => [id, index]));
  const curated = inThisPath
    .filter((needle) => rank.has(needle.id))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  const rest = inThisPath.filter((needle) => !rank.has(needle.id)).sort(byRating);
  return [...curated, ...rest];
};

/** Counts for the door cards on the hub: only doors with something to show. */
export type DoorCount = { needles: number; paths: number };

export const countForDoor = (needles: PublicNeedle[], door: DoorId): DoorCount => {
  const mine = needles.filter((needle) => inDoor(needle, door));
  const paths = new Set(
    mine.flatMap((needle) => needle.paths.filter((path) => doorOfPath.get(path) === door)),
  );
  return { needles: mine.length, paths: paths.size };
};

/**
 * The front shelf: the few needles Rico rated highest and wrote something
 * about. A link with no note is a link, not a recommendation, so it stays in
 * the archive.
 */
export const frontShelf = (needles: PublicNeedle[], limit = 6): PublicNeedle[] =>
  needles
    .filter((needle) => needle.note && needle.rating >= 2)
    .sort(byRating)
    .slice(0, limit);

/** How long it takes, in buckets a reader can choose between. */
export type TimeBucket = "quick" | "short" | "medium" | "long";

export const TIME_BUCKETS: { id: TimeBucket; label: string }[] = [
  { id: "quick", label: "under 10 min" },
  { id: "short", label: "10 – 30 min" },
  { id: "medium", label: "30 – 60 min" },
  { id: "long", label: "an hour or more" },
];

export const timeBucket = (minutes: number | undefined): TimeBucket | undefined => {
  if (minutes === undefined) return undefined;
  if (minutes < 10) return "quick";
  if (minutes <= 30) return "short";
  if (minutes <= 60) return "medium";
  return "long";
};

export type ArchiveFilters = {
  topic: string | null;
  type: NeedleType | null;
  level: Level | null;
  time: TimeBucket | null;
  /** Rating is a floor, not an equality: "2 and up" is the useful question. */
  minRating: number;
};

export const NO_FILTERS: ArchiveFilters = {
  topic: null,
  type: null,
  level: null,
  time: null,
  minRating: 1,
};

export const matchesFilters = (needle: PublicNeedle, filters: ArchiveFilters): boolean => {
  if (filters.topic && !needle.topics.includes(filters.topic)) return false;
  if (filters.type && needle.type !== filters.type) return false;
  if (filters.level && needle.level !== filters.level) return false;
  if (filters.time && timeBucket(needle.minutes) !== filters.time) return false;
  return needle.rating >= filters.minRating;
};

/**
 * Only the filters the data can answer. Chips for a level nothing carries, or
 * for a time bucket when no needle has minutes yet, are dead controls.
 */
export type ArchiveFacets = {
  topics: string[];
  types: NeedleType[];
  levels: Level[];
  times: { id: TimeBucket; label: string }[];
  ratings: number[];
};

export const archiveFacets = (needles: PublicNeedle[]): ArchiveFacets => {
  const topicCounts = new Map<string, number>();
  for (const needle of needles) {
    for (const topic of needle.topics) topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const topics = [...topicCounts.entries()]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(([topic]) => topic);

  const present = <T>(values: (T | undefined)[], order: T[]): T[] => {
    const seen = new Set(values.filter((value): value is T => value !== undefined));
    return order.filter((value) => seen.has(value));
  };

  return {
    topics,
    types: [...new Set(needles.map((needle) => needle.type))].sort(),
    levels: present(
      needles.map((needle) => needle.level),
      ["intro", "deep"],
    ),
    times: TIME_BUCKETS.filter(({ id }) =>
      needles.some((needle) => timeBucket(needle.minutes) === id),
    ),
    // "1 and up" is every needle, so it is the default rather than a chip.
    ratings: [2, 3].filter((floor) => needles.some((needle) => needle.rating >= floor)),
  };
};

/**
 * Where a needle leads, for the reader deciding whether to click: a card is an
 * anchor with no visible address, and "youtube.com" answers most of the doubt.
 */
export const hostLabel = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** One needle at random, for the button that picks instead of the reader. */
export const pickRandom = (
  needles: PublicNeedle[],
  random: () => number = Math.random,
): PublicNeedle | undefined =>
  needles.length === 0 ? undefined : needles[Math.floor(random() * needles.length)];
