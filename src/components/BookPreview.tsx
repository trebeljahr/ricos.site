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
      className="no-underline prose-headings:text-inherit w-full overflow-hidden md:grid mb-10 prose-p:text-zinc-800 dark:prose-p:text-slate-300"
      style={{
        gridTemplateColumns: "15rem auto",
      }}
    >
      <div className="h-64 md:h-full mb-4 relative not-prose">
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
        <h2 className="py-0 my-0">
          <b>{title}</b>
        </h2>
        <p className="mt-0 pt-0">by {bookAuthor}</p>
        <p className="my-0 py-0">
          <b>Rated: {rating}/10</b>
        </p>

        <div>
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
