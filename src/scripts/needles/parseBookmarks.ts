/**
 * Netscape bookmark-file parser (what Chrome, Firefox and Safari export).
 *
 * The format is line-oriented and not valid HTML, so it is walked rather than
 * parsed as a document: `<DT><H3>` opens a folder, the `<DL>` after it is that
 * folder's body, `</DL>` closes it. Folder names matter as much as the links —
 * they are the only context an importer gets about why a link was kept.
 *
 * Exports carry base64 favicons in ICON attributes, which is why a 20k-link
 * file is ~19MB. Nothing here keeps those.
 */
import { readFile } from "node:fs/promises";

export type BookmarkLink = {
  url: string;
  title: string;
  /** Folder names from the top down, e.g. ["Best", "Best Videos"]. */
  folder: string[];
  /** Unix seconds from ADD_DATE, when the export had one. */
  addedAt?: number;
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

export async function parseBookmarksFile(file: string): Promise<BookmarkLink[]> {
  const html = await readFile(file, "utf8");
  const links: BookmarkLink[] = [];

  // `stack` is the folder path of the DL currently being read. `pending` holds
  // the name from the last <H3>, which belongs to the DL that follows it.
  const stack: string[][] = [[]];
  let pending: string | undefined;

  for (const line of html.split(/\r?\n/)) {
    const heading = line.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (heading) {
      pending = decode(heading[1].replace(/<[^>]+>/g, ""));
      continue;
    }

    if (/<dl>/i.test(line)) {
      const parent = stack[stack.length - 1];
      stack.push(pending ? [...parent, pending] : [...parent]);
      pending = undefined;
      continue;
    }

    if (/<\/dl>/i.test(line)) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const anchor = line.match(/<a\s+([^>]*)>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;
    const attributes = anchor[1];
    const href = attributes.match(/href="([^"]*)"/i)?.[1];
    if (!href) continue;
    const addDate = attributes.match(/add_date="(\d+)"/i)?.[1];
    links.push({
      url: decode(href),
      title: decode(anchor[2].replace(/<[^>]+>/g, "")),
      // Drop the browser's own root folder ("Bookmarks bar", "Bookmarks Menu"):
      // it says nothing and would prefix every single path.
      folder: stack[stack.length - 1].filter(
        (name) => !/^bookmarks (bar|menu|toolbar)$/i.test(name),
      ),
      addedAt: addDate ? Number(addDate) : undefined,
    });
  }

  return links;
}
