import { BookCover } from "./cover-image";
import Link from "next/link";
import BookType from "../@types/book";

type Props = {
  book: BookType;
};

export function BookPreview({ book }: Props) {
  const { slug, title, bookCover } = book;
  return (
    <Link
      as={`/booknotes/${slug}`}
      href="/booknotes/[slug]"
      className="book-preview book-cover-image"
      passHref
    >
      <BookCover title={title} src={bookCover} />
    </Link>
  );
}
