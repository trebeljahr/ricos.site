export const EASTER_EGGS_STORAGE_KEY = "easter-eggs:found";
/** Fired on window after a new egg is recorded. */
export const EASTER_EGGS_CHANGED_EVENT = "easter-eggs:changed";

/** Every egg on the site. The found counter shows progress against this list. */
export const EASTER_EGG_IDS = [
  "waving-hand",
  "writing",
  "traveling",
  "newsletter",
  "booknotes",
  "photography",
  "creative-coding",
  "projects",
  "webpages",
] as const;

export type EasterEggId = (typeof EASTER_EGG_IDS)[number];

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
