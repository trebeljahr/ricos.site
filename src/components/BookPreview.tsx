import { Booknote } from "@velite";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Link from "next/link";

type Props = {
  book: Booknote;
  index: number;
};

export function BookPreview({ book, index }: Props) {
  const { link, title, cover, excerpt, subtitle, bookAuthor, rating } = book;

  const defaultExcerpt = "";
  const priority = index < 3;
  return (
    <Link
      as={link}
      href={link}
      className="no-underline prose-headings:text-inherit w-full overflow-hidden md:grid mb-10 prose-p:text-zinc-800 dark:prose-p:text-slate-300 transform transition-transform duration-300 hover:scale-[1.02]"
      style={{
        gridTemplateColumns: "15rem auto",
      }}
    >
      <div className="h-64 md:h-full mb-4 relative not-prose">
        <ImageWithLoader
          src={cover.src}
          alt={cover.alt}
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

      <div className="flex flex-col p-5 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700 prose-headings:mt-2 prose-p:text-zinc-800 dark:prose-p:text-slate-300">
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
