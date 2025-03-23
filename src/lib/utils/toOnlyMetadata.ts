import { CommonMetadata } from "src/@types";
import { deleteUndefinedValues } from "./deleteUndefinedValues";

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
