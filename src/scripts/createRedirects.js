import { readFile } from "node:fs/promises";
import path from "node:path";

export async function generateRedirects() {
  const veliteDir = path.resolve(path.dirname(""), ".velite");

  const newsletters = JSON.parse(await readFile(path.join(veliteDir, "newsletters.json"), "utf-8"));

  // Newsletter number → slug redirects (/N, /newsletters/N, /newsletter/N)
  const newsletterRedirects = newsletters.flatMap(({ number, slugTitle }) => [
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

  return newsletterRedirects;
}
