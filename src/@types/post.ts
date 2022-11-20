import Author from "./author";

export type Post = {
  subtitle?: string;
  slug: string;
  title: string;
  date: string;
  cover: { src: string; alt: string; width: string; height: string };
  author: Author;
  excerpt: string;
  content: string;
};
