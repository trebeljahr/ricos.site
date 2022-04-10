import CoverImage from "./cover-image";
import Link from "next/link";
import BookType from "../types/book";

type Props = {
  book: BookType;
};

export function BookPreview({ book }: Props) {
  const { slug, title, bookCover, bookAuthor } = book;
  return (
    <Link as={`/books/${slug}`} href="/books/[slug]">
      <a>
        <div className="book-preview">
          <div className="book-cover-image">
            <CoverImage slug={slug} title={title} src={bookCover} />
          </div>
        </div>
      </a>
    </Link>
  );
}
