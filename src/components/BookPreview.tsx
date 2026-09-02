import { ImageWithLoader } from "@components/ImageWithLoader";
import { getMDXComponent } from "mdx-bundler/client";
import Link from "next/link";
import { useMemo } from "react";
import type { CommonMetadata, MDXResult } from "src/@types";
import { MetadataDisplay } from "./MetadataDisplay";

const excerptComponents = {
  a: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
};

const MDXExcerpt = ({ source }: { source: MDXResult }) => {
  const Component = useMemo(() => getMDXComponent(source.code), [source.code]);
  return <Component components={excerptComponents} />;
};

type Props = {
  book: CommonMetadata;
  index: number;
};

export function BookPreview({ book, index }: Props) {
  const { link, title, cover, excerpt, subtitle, bookAuthor, markdownExcerpt, rating } = book;

  const defaultExcerpt = "";
  // Only the first cover is a real LCP candidate. Multiple priority images
  // compete for the same "high" fetch slot and slow the actual LCP.
  const priority = index === 0;
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
          // Cover sits in the fixed 15rem grid column at md+. The old value
          // interpolated bare numbers (`768` / `357`) with no unit and had no
          // trailing default size, so the attribute was invalid and every
          // cover fell back to 100vw — a 240px slot pulling the 3840px variant
          // (985KB) on desktop.
          sizes="(max-width: 768px) calc(100vw - 24px), 240px"
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
        <h2 className="my-0!">
          <b>{title}</b>
        </h2>
        <p className="my-0!">{subtitle}</p>
        <p className="my-0!">by {bookAuthor}</p>

        <MetadataDisplay
          date={book.date}
          readingTime={book.metadata.readingTime}
          withAuthorInfo={false}
        />
        <p className="text-sm mt-2">🏆 Rated: {rating}/10</p>

        <div>
          {markdownExcerpt ? (
            <MDXExcerpt source={markdownExcerpt} />
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
