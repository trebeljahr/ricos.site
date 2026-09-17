export const EASTER_EGGS_STORAGE_KEY = "easter-eggs:found";
/** Fired on window after a new egg is recorded. */
export const EASTER_EGGS_CHANGED_EVENT = "easter-eggs:changed";

export type EasterEgg = {
  id: string;
  /** What the egg does, shown on /eggs once found. */
  emoji: string;
  /** Shown on /eggs once found. */
  name: string;
  /** Where to look, shown on /eggs before it is found. */
  where: { hint: string; label: string; href: string };
};

/** Every egg on the site. The counter and /eggs show progress against this list. */
export const EASTER_EGGS = [
  {
    id: "waving-hand",
    emoji: "👋",
    name: "The waving hand",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "writing",
    emoji: "✍️",
    name: "The typo",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "traveling",
    emoji: "✈️",
    name: "The round trip",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "newsletter",
    emoji: "📮",
    name: "The postmark",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "booknotes",
    emoji: "💬",
    name: "The talking books",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "photography",
    emoji: "🖼️",
    name: "The polaroid",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "creative-coding",
    emoji: "⚡",
    name: "The lightning",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "projects",
    emoji: "🚧",
    name: "The construction site",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "webpages",
    emoji: "🕷️",
    name: "The spider",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "night-owl",
    emoji: "🦉",
    name: "The night owl",
    where: { hint: "Somewhere in", label: "the navigation bar", href: "/" },
  },
  {
    id: "flask",
    emoji: "🫧",
    name: "The overflowing flask",
    where: { hint: "Somewhere in", label: "the navigation bar", href: "/" },
  },
  {
    id: "idle-cat",
    emoji: "🐈",
    name: "The napping cat",
    where: { hint: "Wait a minute on", label: "any page", href: "/" },
  },
  {
    id: "clock",
    emoji: "⏰",
    name: "Time flies",
    where: { hint: "Somewhere on", label: "any post", href: "/posts" },
  },
  {
    id: "dino",
    emoji: "🦕",
    name: "The timeline dinosaur",
    where: { hint: "Somewhere on", label: "/timeline", href: "/timeline" },
  },
  {
    id: "sapling",
    emoji: "🌳",
    name: "The watered sapling",
    where: { hint: "Somewhere on", label: "the home page", href: "/" },
  },
  {
    id: "trophy",
    emoji: "⭐",
    name: "The rating stars",
    where: { hint: "Somewhere on", label: "any booknote", href: "/booknotes" },
  },
  {
    id: "monkey",
    emoji: "🍌",
    name: "The three wise monkeys",
    where: { hint: "Somewhere on", label: "/newsletters", href: "/newsletters" },
  },
  {
    id: "needle",
    emoji: "🪡",
    name: "The needle in the haystack",
    where: { hint: "Somewhere on", label: "/needlestack", href: "/needlestack" },
  },
] as const satisfies readonly EasterEgg[];

export const EASTER_EGG_IDS = EASTER_EGGS.map((egg) => egg.id);

export type EasterEggId = (typeof EASTER_EGGS)[number]["id"];

export function getFoundEggs(): string[] {
  try {
    const raw = window.localStorage.getItem(EASTER_EGGS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Records an easter egg as found. Returns true the first time `id` is found. */
export function markEggFound(id: string): boolean {
  const found = getFoundEggs();
  if (found.includes(id)) return false;
  try {
    window.localStorage.setItem(EASTER_EGGS_STORAGE_KEY, JSON.stringify([...found, id]));
  } catch {
    // Storage blocked (private mode, disabled site data): the find still counts for this visit.
  }
  window.dispatchEvent(new Event(EASTER_EGGS_CHANGED_EVENT));
  return true;
}

/**
 * Records a find from outside React (no usePlausible hook available). Plausible's
 * snippet queues calls on window.plausible until its script has loaded.
 */
export function recordEggFind(id: string) {
  const plausible = (window as { plausible?: (event: string, options?: object) => void }).plausible;
  plausible?.("Easter Egg", { props: { egg: id } });
  markEggFound(id);
}
