import fs from "fs/promises";
import { join } from "path";
import matter from "gray-matter";

const contentDir = join(process.cwd(), "src", "content");
const postsDirectory = join(contentDir, "posts");
const bookReviewsDirectory = join(contentDir, "booknotes");
const newsletterDirectory = join(contentDir, "newsletters");

export async function getBySlug(
  slug: string,
  fields: string[] = [],
  directory: string
) {
  const realSlug = slug.replace(/\.(mdx|md)$/, "");
  const fullPath = join(directory, `${slug}`);

  type Items = { [key: string]: string };
  const items: Items = {};

  const fileContents = await fs.readFile(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  fields.forEach(async (field) => {
    if (field === "slug") {
      items[field] = realSlug;
    } else if (field === "content") {
      items.content = content;
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

export async function getAllMarkdownPosts(fields: string[] = []) {
  const slugs = await getPostSlugs();
  const postsPromises = slugs
    .filter((slug) => slug.endsWith(".md"))
    .map((slug) => getPostBySlug(slug, fields));
  const posts = await Promise.all(postsPromises);
  posts.sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
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
