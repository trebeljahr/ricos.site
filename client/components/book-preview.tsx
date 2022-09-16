import { BookCover } from "./cover-image";
import Link from "next/link";
import BookType from "../types/book";

type Props = {
  book: BookType;
};

export function BookPreview({ book }: Props) {
  const { slug, title, bookCover } = book;
  return (
    <Link as={`/booknotes/${slug}`} href="/booknotes/[slug]">
      <a>
        <div className="book-preview">
          <BookCover title={title} src={bookCover} />
        </div>
      </a>
    </Link>
  );
}
