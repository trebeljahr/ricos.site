/**
 * The mailing lists a reader can join on this site, keyed by a short name.
 *
 * Only these keys cross the wire: the form posts keys, the confirm token
 * carries keys, and the ListMonk list id behind each key is read from the
 * server's env. A raw list id from the browser is never accepted, so a
 * stranger cannot sign anyone up to another project's list on the shared
 * ListMonk instance.
 *
 * Client-safe: no Node imports. `offeredListKeys` reads a value inlined at
 * build time (see `NEWSLETTER_OFFERED_LISTS` in next.config.mjs).
 */

export type NewsletterList = {
  /** Display name. */
  name: string;
  /** What a reader gets, in one line. */
  promise: string;
  /** How often mail arrives. */
  cadence: string;
  /** Env var holding the ListMonk list id. */
  listIdEnv: string;
};

export const NEWSLETTER_LISTS = {
  "live-and-learn": {
    name: "Live and Learn",
    promise:
      "Digital postcards filled with beauty, travel stories and links to nice things I have found.",
    cadence: "Once or twice a month.",
    listIdEnv: "LISTMONK_LIST_ID",
  },
  computer: {
    name: "How computers work: new chapters",
    promise: "One short email with a link each time a new chapter of How computers work goes up.",
    cadence: "Only when a chapter is published.",
    listIdEnv: "LISTMONK_COMPUTER_LIST_ID",
  },
} as const satisfies Record<string, NewsletterList>;

export type ListKey = keyof typeof NEWSLETTER_LISTS;

export const DEFAULT_LIST: ListKey = "live-and-learn";

export const LIST_KEYS = Object.keys(NEWSLETTER_LISTS) as ListKey[];

export function isListKey(value: unknown): value is ListKey {
  return typeof value === "string" && Object.hasOwn(NEWSLETTER_LISTS, value);
}

/**
 * The `lists` field of a signup request. Absent means the default list, as
 * every form posted before lists existed. Anything but a non-empty array of
 * known keys is `null`. Duplicates collapse, order follows `LIST_KEYS`.
 */
export function parseListKeys(raw: unknown): ListKey[] | null {
  if (raw === undefined) return [DEFAULT_LIST];
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > LIST_KEYS.length * 2) return null;
  if (!raw.every(isListKey)) return null;
  return LIST_KEYS.filter((key) => raw.includes(key));
}

/** The ListMonk list id behind `key`, or `null` when its env var is unset or invalid. */
export function listIdFor(key: ListKey): number | null {
  const raw = process.env[NEWSLETTER_LISTS[key].listIdEnv];
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Server side: the lists a signup may join right now. Live and Learn always;
 * the others only on ListMonk (the Mailgun pin has one list) and once their
 * list id is configured.
 */
export function availableListKeys(): ListKey[] {
  const onMailgun = process.env.NEWSLETTER_PROVIDER?.trim().toLowerCase() === "mailgun";
  return LIST_KEYS.filter((key) => key === DEFAULT_LIST || (!onMailgun && listIdFor(key) !== null));
}

/**
 * Browser side: the same answer as `availableListKeys`, fixed at build time.
 * Unset (tests, a build without the env) means the default list only.
 */
export function offeredListKeys(): ListKey[] {
  const raw = process.env.NEWSLETTER_OFFERED_LISTS;
  if (!raw) return [DEFAULT_LIST];
  const keys = raw.split(",").filter(isListKey);
  return keys.includes(DEFAULT_LIST) ? keys : [DEFAULT_LIST, ...keys];
}

export function listNames(keys: readonly ListKey[]): string {
  const names = keys.map((key) => NEWSLETTER_LISTS[key].name);
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
