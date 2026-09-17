export const EASTER_EGGS_STORAGE_KEY = "easter-eggs:found";
/** Fired on window after a new egg is recorded. */
export const EASTER_EGGS_CHANGED_EVENT = "easter-eggs:changed";

export type EasterEgg = {
  id: string;
  /** Shown on /eggs once found. */
  name: string;
  /** Where to look, shown on /eggs before it is found. */
  where: { label: string; href: string };
};

/** Every egg on the site. The counter and /eggs show progress against this list. */
export const EASTER_EGGS = [
  { id: "waving-hand", name: "The waving hand", where: { label: "the home page", href: "/" } },
  { id: "writing", name: "The typo", where: { label: "the home page", href: "/" } },
  { id: "traveling", name: "The round trip", where: { label: "the home page", href: "/" } },
  { id: "newsletter", name: "The postmark", where: { label: "the home page", href: "/" } },
  { id: "booknotes", name: "The talking books", where: { label: "the home page", href: "/" } },
  { id: "photography", name: "The polaroid", where: { label: "the home page", href: "/" } },
  { id: "creative-coding", name: "The lightning", where: { label: "the home page", href: "/" } },
  { id: "projects", name: "The construction site", where: { label: "the home page", href: "/" } },
  { id: "webpages", name: "The spider", where: { label: "the home page", href: "/" } },
  { id: "night-owl", name: "The night owl", where: { label: "the navigation bar", href: "/" } },
  {
    id: "monkey",
    name: "The three wise monkeys",
    where: { label: "/newsletters", href: "/newsletters" },
  },
  {
    id: "needle",
    name: "The needle in the haystack",
    where: { label: "/needlestack", href: "/needlestack" },
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
