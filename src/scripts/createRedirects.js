import slugify from "@sindresorhus/slugify";
import { readFile } from "fs/promises";
import matter from "gray-matter";
import { newsletterPath, sortedNewsletterNames } from "./sortedNewsletters.js";
import path from "path";

export async function generateRedirects() {
  const redirects = await Promise.all(
    sortedNewsletterNames.map(async (fileName) => {
      const mdFileRaw = await readFile(
        path.join(newsletterPath, fileName),
        "utf-8"
      );

      const { data } = matter(mdFileRaw);

      // console.log(data.title);
      console.log(data);

      const slugTitle = slugify(data.title);

      return {
        source: `/newsletters/${fileName.replace(".md", "")}`,
        destination: `/newsletters/${slugTitle}`,
        permanent: true,
      };
    })
  );

  return redirects;
}
