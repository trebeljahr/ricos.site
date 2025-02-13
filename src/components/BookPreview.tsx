import { ImageWithLoader } from "@components/ImageWithLoader";
import { MDXRemote } from "next-mdx-remote";
import Link from "next/link";
import { CommonMetadata } from "src/lib/utils";
import { MetadataDisplay } from "./MetadataDisplay";

type Props = {
  book: CommonMetadata;
  index: number;
};

export function BookPreview({ book, index }: Props) {
  const {
    link,
    title,
    cover,
    excerpt,
    subtitle,
    bookAuthor,
    markdownExcerpt,
    rating,
  } = book;

  const defaultExcerpt = "";
  const priority = index < 3;
  return (
    <Link
      as={link}
      href={link}
      className="no-underline w-full overflow-hidden md:grid mb-10 transform transition-transform duration-300 hover:scale-[1.02]"
      style={{
        gridTemplateColumns: "15rem auto",
      }}
    >
      <div className="h-64 md:h-full mb-4 relative">
        <ImageWithLoader
          src={cover.src}
          alt={cover.alt}
          fill
          sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
            priority ? 768 : 357
          }`}
          priority={priority}
          style={{
            objectFit: "cover",
          }}
        />
      </div>

      <div className="flex flex-col p-5 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700">
        <h2 className="!my-0">
          <b>{title}</b>
        </h2>
        <p className="!my-0">{subtitle}</p>
        <p className="!my-0">by {bookAuthor}</p>

        <MetadataDisplay
          date={book.date}
          readingTime={book.metadata.readingTime}
          withAuthorInfo={false}
        />
        <p className="text-sm mt-2">🏆 Rated: {rating}/10</p>

        <div>
          {markdownExcerpt ? (
            <MDXRemote {...markdownExcerpt} />
          ) : excerpt ? (
            <p className="mb-2">{excerpt}</p>
          ) : (
            <p>{defaultExcerpt}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
