/** A free portrait of a quote author from Wikimedia Commons. See src/scripts/quotes/authorPortraits.ts. */
export type Portrait = {
  file: string;
  thumb: string;
  /** Commons file page, which holds the full license. */
  page: string;
  artist: string;
  license: string;
};

export type Portraits = Record<string, Portrait>;

/** Author names in quotes.json sometimes carry a leading dash or a year: "— Sam Altman", "Samuel Butler (1863)". */
export const cleanAuthor = (name: string) =>
  name
    .replace(/^[\s—–-]+/, "")
    .replace(/\s*\(\d{4}\)$/, "")
    .trim();
