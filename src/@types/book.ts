import { MDXRemoteSerializeResult } from "next-mdx-remote";

type BookType = {
  slug: string;
  title: string;
  subtitle?: string;
  bookCover: string;
  bookAuthor: string;
  done: boolean;
  tags: [];
  summary: false;
  detailedNotes: false;
  amazonLink: string;
  rating: number;
  content: string;
};

export default BookType;
