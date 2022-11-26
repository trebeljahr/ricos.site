import { BookCover } from "./cover-image";
import Link from "next/link";
import { Booknote } from "contentlayer/generated";
import { PostSubTitle, PostTitle } from "./post-title";

type Props = {
  book: Booknote;
};

export function BookPreview({ book }: Props) {
  const { slug, title, bookCover, excerpt, subtitle, bookAuthor, rating } =
    book;

  const defaultExcerpt = "";
  return (
    <div className="book-info">
      <Link as={slug} href={slug} className="book-cover-image">
        <BookCover title={title} src={bookCover} />
      </Link>
      <div className="book-preview-text">
        <div className="book-preview-heading">
          <Link as={slug} href={slug}>
            <p>
              <b>
                {title} {subtitle && `| ${subtitle}`}
              </b>{" "}
              by {bookAuthor}
            </p>
          </Link>
        </div>
        <p>
          <b>Rated: {rating}/10</b>
        </p>
        {excerpt ? (
          <>
            <p>{excerpt}</p>
            <Link as={slug} href={slug}>
              <p>Read full book notes</p>
            </Link>
          </>
        ) : (
          <p>{defaultExcerpt}</p>
        )}
      </div>
    </div>
  );
}
