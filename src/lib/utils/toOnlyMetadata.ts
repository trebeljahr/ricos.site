import type { CommonMetadata } from "src/@types";
import { deleteUndefinedValues } from "./deleteUndefinedValues";

/** Card metadata for cards that show the plain-text `excerpt` only. */
export type CardMetadata = Omit<CommonMetadata, "excerptHtml">;

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
    excerptHtml,
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
    excerptHtml,
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

export const toCardMetadata = (obj: CommonMetadata): CardMetadata => {
  const { excerptHtml: _excerptHtml, ...rest } = toOnlyMetadata(obj);
  return rest;
};
