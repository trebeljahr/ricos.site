import { MDXRemoteSerializeResult } from "next-mdx-remote";
import Author from "./author";

export type Post = {
  subtitle?: string;
  slug: string;
  title: string;
  date: string;
  cover: string;
  author: Author;
  excerpt: string;
  content: MDXRemoteSerializeResult<Record<string, unknown>>;
};
