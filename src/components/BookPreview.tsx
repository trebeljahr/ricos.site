import type { CommonMetadata } from "src/@types";
import { Card } from "./Card";

type Props = {
  book: CommonMetadata;
  index: number;
};

export function BookPreview({ book, index }: Props) {
  const { link, title, cover, excerpt, subtitle, bookAuthor, markdownExcerpt, rating, date } = book;

  return (
    <Card
      layout="horizontal"
      coverAspect="portrait"
      link={link}
      title={title}
      cover={cover}
      subtitle={subtitle}
      excerpt={excerpt}
      markdownExcerpt={markdownExcerpt}
      date={date}
      readingTime={book.metadata.readingTime}
      // Only the first cover is a real LCP candidate. Multiple priority images
      // compete for the same "high" fetch slot and slow the actual LCP.
      priority={index === 0}
    >
      <p className="m-0 mt-3 text-sm text-gray-600 dark:text-gray-300">
        {[bookAuthor && `by ${bookAuthor}`, rating !== undefined && `🏆 Rated ${rating}/10`]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </Card>
  );
}
