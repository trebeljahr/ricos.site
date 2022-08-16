import fs from "fs";
import { join } from "path";
import matter from "gray-matter";

const postsDirectory = join(process.cwd(), "_posts");
const bookReviewsDirectory = join(process.cwd(), "_booknotes");

function getBySlug(slug: string, fields: string[] = [], directory: string) {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(directory, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  type Items = {
    [key: string]: string;
  };

  const items: Items = {};

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === "slug") {
      items[field] = realSlug;
    } else if (field === "content") {
      items[field] = content;
    } else {
      items[field] = data[field] ?? "";
    }
  });

  return items;
}

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
}

export function getBookSlugs() {
  return fs.readdirSync(bookReviewsDirectory);
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  return getBySlug(slug, fields, postsDirectory);
}

export function getBookReviewBySlug(slug: string, fields: string[] = []) {
  return getBySlug(slug, fields, bookReviewsDirectory);
}

export function getAllPosts(fields: string[] = []) {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug, fields))
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

export function getAllBookReviews(fields: string[] = []) {
  const slugs = getBookSlugs();
  const books = slugs.map((slug) => getBookReviewBySlug(slug, fields));
  return books;
}
