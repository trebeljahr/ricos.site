import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The single redirect table. next.config.mjs serves it; the markdown build
 * (src/lib/remarkResolveRedirects.ts) rewrites links through it so shipped
 * pages never link a redirect source; the link checker verifies both agree.
 */
export const STATIC_REDIRECTS = [
  // Exact "/newsletter" has to come first: the ":id*" rule below also matches
  // it with an empty id and resolves to "/newsletters/", which Next then
  // redirects again to "/newsletters" (trailingSlash is false). One hop, not two.
  {
    source: "/newsletter",
    destination: "/newsletters",
    permanent: true,
  },
  {
    source: "/newsletter/:id*",
    destination: "/newsletters/:id*",
    permanent: true,
  },
  {
    source: "/pages/:id*",
    destination: "/:id*",
    permanent: true,
  },
  {
    source: "/feed.xml",
    destination: "/rss.xml",
    permanent: true,
  },
  {
    source: "/posts/my-productivity-systems",
    destination: "/posts/my-productivity-system",
    permanent: true,
  },
  // Short links for key pages
  {
    source: "/plasmaball",
    destination: "/r3f/scenes/plasma-ball",
    permanent: true,
  },
  {
    source: "/plasma",
    destination: "/r3f/scenes/plasma-ball",
    permanent: true,
  },
  {
    source: "/plasma-ball",
    destination: "/r3f/scenes/plasma-ball",
    permanent: true,
  },
  {
    source: "/photos",
    destination: "/photography/best-of",
    permanent: true,
  },
  {
    source: "/needles",
    destination: "/needlestack",
    permanent: true,
  },
  {
    source: "/shader-art",
    destination: "/r3f/scenes/shader-art-demo",
    permanent: true,
  },
  {
    source: "/yellow",
    destination: "/posts/the-best-yellow",
    permanent: true,
  },
  {
    source: "/start",
    destination: "/start-here",
    permanent: true,
  },
  {
    source: "/support",
    destination: "/donate",
    permanent: true,
  },
  {
    source: "/everything",
    destination: "/timeline",
    permanent: true,
  },
];

/**
 * Newsletter number → slug redirects (/N, /newsletters/N, /newsletter/N).
 * @param {{ number: string, slugTitle: string }[]} newsletters
 */
export function newsletterRedirects(newsletters) {
  return newsletters.flatMap(({ number, slugTitle }) => [
    {
      source: `/${number}`,
      destination: `/newsletters/${slugTitle}`,
      permanent: true,
    },
    {
      source: `/newsletters/${number}`,
      destination: `/newsletters/${slugTitle}`,
      permanent: true,
    },
    {
      source: `/newsletter/${number}`,
      destination: `/newsletters/${slugTitle}`,
      permanent: true,
    },
  ]);
}

export async function generateRedirects() {
  const veliteDir = path.resolve(path.dirname(""), ".velite");

  const newsletters = JSON.parse(await readFile(path.join(veliteDir, "newsletters.json"), "utf-8"));

  return [...newsletterRedirects(newsletters), ...STATIC_REDIRECTS];
}
