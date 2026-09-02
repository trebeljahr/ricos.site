import type { CommonMetadata } from "src/@types";
import { deleteUndefinedValues } from "./deleteUndefinedValues";

/**
 * Card metadata without the compiled MDX excerpt.
 *
 * `markdownExcerpt` is a bundled MDX module (~1.2KB of JS per entry) and only
 * `PostPreview`/`BookPreview` render it. Cards that show the plain-text
 * `excerpt` instead should not ship it into __NEXT_DATA__.
 */
export type CardMetadata = Omit<CommonMetadata, "markdownExcerpt">;

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

export const toCardMetadata = (obj: CommonMetadata): CardMetadata => {
  const { markdownExcerpt: _markdownExcerpt, ...rest } = toOnlyMetadata(obj);
  return rest;
};
