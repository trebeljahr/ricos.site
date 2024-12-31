import { Travelblog } from "@velite";
import { nanoid } from "nanoid";
import { ImageProps, MDXResult } from "src/@types";

export const toTitleCase = (str: string) =>
  str.slice(0, 1).toUpperCase() + str.slice(1);

export function turnKebabIntoTitleCase(kebab: string) {
  return kebab.split("-").map(toTitleCase).join(" ");
}

export const addIdAndIndex = (image: ImageProps, index: number) => {
  return {
    ...image,
    id: nanoid(),
    index,
  };
};

export type HasDate = { date: string };
export const byDate = (a: HasDate, b: HasDate) =>
  new Date(a.date) > new Date(b.date) ? -1 : 1;

export type CommonMetadata = {
  title: string;
  slug: string;
  subtitle?: string;

  date: string;
  excerpt: string;
  markdownExcerpt: MDXResult;
  link: string;
  tags: string;
  cover: {
    src: string;
    alt: string;
  };
  metadata: {
    readingTime: number;
    wordCount: number;
  };
  published: boolean;
  number?: string; // for newsletters
  slugTitle?: string; // for newsletters

  bookAuthor?: string; // for booknotes
  rating?: number; // for booknotes
  summary?: boolean; // for booknotes

  show?: string; // for podcastnotes
  episode?: number; // for podcastnotes

  parentFolder?: string; // for travelblogs
};

export const extractAndSortMetadata = (
  list: CommonMetadata[]
): CommonMetadata[] => {
  return list.filter(byOnlyPublished).sort(byDate).map(toOnlyMetadata);
};

export const toOnlyMetadata = (obj: CommonMetadata): CommonMetadata => {
  const {
    link,
    title,
    cover,
    subtitle,
    metadata,
    date,
    slug,
    excerpt,
    tags,
    summary,
    number,
    parentFolder,
    bookAuthor,
    markdownExcerpt,
    rating,
    published,
    show,
    episode,
  } = obj;

  const output = deleteUndefinedValues({
    title,
    slug,
    date,
    subtitle,
    excerpt,
    show,
    markdownExcerpt,
    episode,
    metadata,
    cover,
    summary,
    parentFolder,
    link,
    tags,
    number,
    bookAuthor,
    rating,
    published,
  });
  return output;
};

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function byOnlyPublished({ published }: { published: boolean }) {
  // return process.env.NODE_ENV === "development" || published;
  return published;
}

export function deleteUndefinedValues(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] === undefined) delete obj[key];
      else obj[key] = deleteUndefinedValues(obj[key]);
    }
  }

  return obj;
}

export function replaceUndefinedWithNull(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      obj[key] = replaceUndefinedWithNull(obj[key]);
    }
  }

  return obj;
}
