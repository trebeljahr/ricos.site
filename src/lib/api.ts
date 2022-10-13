import fs from "fs/promises";
import { join } from "path";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { serialize } from "next-mdx-remote/serialize";
import { MDXRemoteSerializeResult } from "next-mdx-remote";

const contentDir = join(process.cwd(), "src", "content");
const postsDirectory = join(contentDir, "posts");
const bookReviewsDirectory = join(contentDir, "booknotes");
const newsletterDirectory = join(contentDir, "newsletters");

async function getBySlug(
  slug: string,
  fields: string[] = [],
  directory: string
) {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(directory, `${realSlug}`);
  const fileContents = await fs.readFile(fullPath, "utf8");

  type Items = { [key: string]: string };
  const items: Items = {};

  const mdxSrc = await serialize(fileContents, {
    mdxOptions: {
      remarkPlugins: [remarkGfm, remarkToc],
      rehypePlugins: [rehypeRaw, rehypeHighlight],
    },
    parseFrontmatter: true,
  });

  const data = mdxSrc.frontmatter || {};
  // Ensure only the minimal needed data is exposed
  fields.forEach(async (field) => {
    if (field === "slug") {
      items[field] = realSlug;
    } else if (field === "content") {
      items.content = mdxSrc.compiledSource;
    } else {
      items[field] = data[field] ?? "";
    }
  });

  return items;
}

export function getPostSlugs() {
  return fs.readdir(postsDirectory);
}

export function getBookSlugs() {
  return fs.readdir(bookReviewsDirectory);
}

export function getNewsletterSlugs() {
  return fs.readdir(newsletterDirectory);
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  return getBySlug(slug, fields, postsDirectory);
}

export function getNewsletterBySlug(slug: string, fields: string[] = []) {
  return getBySlug(slug, fields, newsletterDirectory);
}

export function getBookReviewBySlug(slug: string, fields: string[] = []) {
  return getBySlug(slug, fields, bookReviewsDirectory);
}

export async function getAllPosts(fields: string[] = []) {
  const slugs = await getPostSlugs();
  const postsPromises = slugs.map((slug) => getPostBySlug(slug, fields));
  const posts = await Promise.all(postsPromises);
  posts.sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

export async function getAllBookReviews(fields: string[] = []) {
  const slugs = await getBookSlugs();
  const booksPromises = slugs.map((slug) => getBookReviewBySlug(slug, fields));
  const books = await Promise.all(booksPromises);
  return books;
}

export async function getAllNewsletters(fields: string[] = []) {
  const slugs = await getNewsletterSlugs();
  const newslettersPromises = slugs.map((slug) =>
    getNewsletterBySlug(slug, fields)
  );
  const newsletters = await Promise.all(newslettersPromises);

  return newsletters;
}
