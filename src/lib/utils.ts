import { Travelblog } from "@velite";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { NextApiRequest, NextApiResponse } from "next";
import { promisify } from "util";
import { byDates } from "./dateUtils";
import { activateEmailListMember } from "./mailgun";
import { ImageProps } from "src/@types";

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
  date: string;
  excerpt: string;
  link: string;
  tags: string[];
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
};

export const toOnlyMetadata = (obj: CommonMetadata): CommonMetadata => {
  const {
    link,
    title,
    cover,
    metadata,
    date,
    slug,
    excerpt,
    tags,
    number,
    bookAuthor,
    rating,
    published,
  } = obj;

  const output = deleteUndefinedValues({
    title,
    slug,
    date,
    excerpt,
    metadata,
    cover,
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

export async function getHash(str: string): Promise<string> {
  const scrypt = promisify(crypto.scrypt);

  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");

  const hash: any = await scrypt(str, process.env.SALT, 32);
  return hash.toString("hex");
}

export async function checkHash(str: string, hashFromUrl: string) {
  const scrypt = promisify(crypto.scrypt);

  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");

  const inputHash: any = await scrypt(str, process.env.SALT || "", 64);
  return inputHash.toString("hex") === hashFromUrl;
}

export async function confirmEmail(req: NextApiRequest, res: NextApiResponse) {
  if (!checkHash(req.query.email as string, req.query.hash as string)) {
    return res.status(400).json({
      error: "An error occured...",
      errorMessage:
        "Hash provided with query doesn't match hash from email! Did you click the correct link?",
    });
  }

  await activateEmailListMember(req.query.email as string);
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

export function sortAndFilterNotes(stories: Travelblog[], tripName?: string) {
  return stories
    .filter(byOnlyPublished)
    .filter(({ parentFolder }) => !tripName || parentFolder === tripName)
    .sort(byDates);
}
