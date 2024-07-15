import { Booknote } from "@contentlayer/generated";
import Link from "next/link";
import { BookCover } from "./CoverImage";
import Image from "next/image";

type Props = {
  book: Booknote;
  index: number;
};

export function BookPreview({ book, index }: Props) {
  const { slug, title, bookCover, excerpt, subtitle, bookAuthor, rating } =
    book;

  const defaultExcerpt = "";
  const priority = index < 3;
  return (
    <Link
      as={slug}
      href={slug}
      className="w-full overflow-hidden md:grid mb-10 card-hover"
      style={{
        gridTemplateColumns: "15rem auto",
      }}
    >
      <div className="h-64 md:h-full mb-4 relative">
        <Image
          src={bookCover}
          alt={title}
          fill
          sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
            priority ? 780 : 357
          }`}
          priority={priority}
          style={{
            objectFit: "cover",
          }}
        />
      </div>

      <div className="flex flex-col p-5">
        <h2 className="pt-0 mb-0 pb-0">
          <b>{title}</b>
        </h2>
        <p className="mt-0 pt-0">by {bookAuthor}</p>
        <p className="text-grey">
          <b>Rated: {rating}/10</b>
        </p>

        <div className="pt-2 text-grey">
          {excerpt ? (
            <>
              <p className="mb-2">{excerpt}</p>
            </>
          ) : (
            <p>{defaultExcerpt}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
