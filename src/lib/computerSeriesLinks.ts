// The prev/up/next line at the top and bottom of every chapter file, so the
// series can be clicked through in Obsidian. Each line sits between two HTML
// comments, which Obsidian hides; `pnpm computer:links` rewrites whatever is
// between them, and the word count and the site strip the whole block.

export type NavLinks = { prev?: string; next?: string; up?: string };

const NAV_OPEN = "<!-- nav: pnpm computer:links rewrites this line -->";
const NAV_CLOSE = "<!-- /nav -->";
// The closing comment may lose its ">" at the very end of a file (seen after
// an edit in Obsidian); still treat it as the end of the block.
const NAV_BLOCK = /<!-- nav[^>]*-->[\s\S]*?<!-- \/nav --(?:>|\s*$)/g;
/** Frontmatter keys an earlier version of the script wrote. */
const OLD_KEYS = ["prev:", "next:", "up:"];

export function stripNav(body: string): string {
  return body.replace(NAV_BLOCK, "");
}

export function navBlock({ prev, next, up }: NavLinks): string {
  const parts = [prev && `← ${prev}`, up && `↑ ${up}`, next && `${next} →`].filter(Boolean);
  return `${NAV_OPEN}\n${parts.join(" · ")}\n${NAV_CLOSE}`;
}

/**
 * Rewrites every nav block in the file. A file without one gets a block right
 * under the frontmatter and another at the end; one deleted by hand stays
 * deleted. The text around the blocks is left as it is.
 */
export function setNavLinks(source: string, links: NavLinks): string {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) throw new Error("File has no frontmatter");
  const frontmatter = match[1]
    .split("\n")
    .filter((line) => !OLD_KEYS.some((key) => line.startsWith(key)))
    .join("\n");
  const block = navBlock(links);
  const body = source.slice(match[0].length);
  // search(), not test(): test() on a /g regex carries lastIndex over between calls.
  const nextBody =
    body.search(NAV_BLOCK) !== -1
      ? body.replace(NAV_BLOCK, block)
      : `\n${block}\n${body.trimEnd()}\n\n${block}\n`;
  return `---\n${frontmatter}\n---\n${nextBody}`;
}

/** "Part 1 - The Basics/1.1 Bits and Encodings.md", relative to the series folder. */
export const CHAPTER_FILE = /^Part [^/]+\/[^/]+\.md$/;

export type IndexEntry = { folder: string; stem: string; parent?: string };

/** Index.md: every chapter in reading order under its part, asides indented. */
export function indexNote(entries: IndexEntry[]): string {
  const lines = [
    "# How computers work",
    "",
    "Written by `pnpm computer:links` in reading order (`order` in each file); edits here get overwritten.",
    "The outline is [[introduction]]. Progress is at /dev/writing on the dev server.",
  ];
  let folder = "";
  for (const entry of entries) {
    if (entry.folder !== folder) {
      folder = entry.folder;
      lines.push("", `## ${folder}`, "");
    }
    lines.push(`${entry.parent ? "\t" : ""}- [[${entry.stem}]]`);
  }
  return `${lines.join("\n")}\n`;
}
