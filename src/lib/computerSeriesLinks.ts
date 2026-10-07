// Edits the prev/next/up lines of a chapter file's frontmatter in place, so a
// rerun never reformats the rest of the YAML or touches the text below it.

export type NavLinks = { prev?: string; next?: string; up?: string };

const NAV_KEYS = ["prev", "next", "up"] as const;

export function setNavLinks(source: string, links: NavLinks): string {
  const match = /^---\n([\s\S]*?)\n---(\n|$)/.exec(source);
  if (!match) throw new Error("File has no frontmatter");
  const kept = match[1]
    .split("\n")
    .filter((line) => !NAV_KEYS.some((key) => line.startsWith(`${key}:`)));
  const nav = NAV_KEYS.flatMap((key) =>
    links[key] ? [`${key}: ${JSON.stringify(links[key])}`] : [],
  );
  const frontmatter = [...kept, ...nav].join("\n");
  return `---\n${frontmatter}\n---${match[2]}${source.slice(match[0].length)}`;
}
