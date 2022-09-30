import { BookCover } from "./cover-image";
import Link from "next/link";
import BookType from "../@types/book";

type Props = {
  book: BookType;
};

export function BookPreview({ book }: Props) {
  const { slug, title, bookCover } = book;
  return (
    <Link as={`/booknotes/${slug}`} href="/booknotes/[slug]">
      <a className="book-preview book-cover-image">
        <BookCover title={title} src={bookCover} />
      </a>
    </Link>
  );
}
