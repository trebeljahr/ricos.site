import { Booknote } from "@contentlayer/generated";
import Link from "next/link";
import { BookCover } from "./CoverImage";

type Props = {
  book: Booknote;
  index: number;
};

export function BookPreview({ book, index }: Props) {
  const { slug, title, bookCover, excerpt, subtitle, bookAuthor, rating } =
    book;

  const defaultExcerpt = "";
  return (
    <div className="flex flex-col py-5 pr-5 mb-5">
      <div className="flex">
        <Link
          as={slug}
          href={slug}
          className="block relative mb-2 w-60 overflow-hidden rounded-md"
        >
          <BookCover title={title} src={bookCover} priority={index === 0} />
        </Link>
        <div className="flex flex-col pl-5">
          <Link as={slug} href={slug}>
            <p>
              <b>
                {title} {subtitle && `| ${subtitle}`}
              </b>{" "}
              by {bookAuthor}
            </p>
          </Link>
          <p>
            <b>Rated: {rating}/10</b>
          </p>
        </div>
      </div>

      <div className="pt-2">
        {excerpt ? (
          <>
            <p className="mb-2">{excerpt}</p>
            <Link as={slug} href={slug}>
              <p className="mb-0">Read full book notes</p>
            </Link>
          </>
        ) : (
          <p>{defaultExcerpt}</p>
        )}
      </div>
    </div>
  );
}
