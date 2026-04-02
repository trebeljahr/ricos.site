import { readFile } from "fs/promises";
import path from "path";

export async function generateRedirects() {
  const veliteDir = path.resolve(path.dirname(""), ".velite");

  const newsletters = JSON.parse(
    await readFile(path.join(veliteDir, "newsletters.json"), "utf-8")
  );
  const posts = JSON.parse(
    await readFile(path.join(veliteDir, "posts.json"), "utf-8")
  );

  // Newsletter number → slug redirects (both /newsletters/N and /newsletter/N)
  const newsletterRedirects = newsletters.flatMap(({ number, slugTitle }) => [
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

  // Post short links: /slug → /posts/slug
  const postShortLinks = posts
    .filter((p) => p.published)
    .map(({ slug }) => ({
      source: `/${slug}`,
      destination: `/posts/${slug}`,
      permanent: true,
    }));

  return [...newsletterRedirects, ...postShortLinks];
}
