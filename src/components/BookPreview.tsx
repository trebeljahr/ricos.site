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
      className="no-underline prose-headings:text-inherit w-full overflow-hidden mb-10 prose-p:text-zinc-800 dark:prose-p:text-slate-300 transform transition-transform duration-300 hover:scale-[1.02] md:grid md:grid-cols-[15rem_auto]"
    >
      <div className="h-64 md:h-full mb-4 relative not-prose">
        <ImageWithLoader
          src={cover.src}
          alt={cover.alt}
          sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
            priority ? 768 : 357
          }`}
          width={cover.width}
          height={cover.height}
          priority={priority}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      <div className="flex flex-col p-5 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700 prose-headings:mt-2 prose-p:text-zinc-800 dark:prose-p:text-slate-300">
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
