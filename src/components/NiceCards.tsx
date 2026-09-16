import { ImageWithLoader } from "@components/ImageWithLoader";
import clsx from "clsx";
import { getMDXComponent } from "mdx-bundler/client";
import Link from "next/link";
import { useMemo } from "react";
import type { CommonMetadata, MDXResult } from "src/@types";
import { MetadataDisplay } from "./MetadataDisplay";

const MDXExcerpt = ({ source }: { source: MDXResult }) => {
  const Component = useMemo(() => getMDXComponent(source.code), [source.code]);
  return <Component />;
};

// The browser draws the "…" when an excerpt overflows, so cards keep a
// consistent height no matter how long the stored excerpt is.
const excerptClassName = "mt-1 line-clamp-4 [&_p]:my-0";

type CardProps = {
  cover: CommonMetadata["cover"];
  link: string;
  title: string;
  excerpt?: string;
  markdownExcerpt?: MDXResult;
  subtitle?: string;
  typeLabel?: string;
  priority?: boolean;
  bigImage?: boolean;
  amountOfStories?: number;
  date?: string;
  readingTime?: number;
  coverAspect?: CoverAspect;
};

// "tall" crops photos into a fixed-height banner. "video" keeps the whole
// image at 16:9, which suits screenshots (e.g. the /projects cards).
export type CoverAspect = "tall" | "video";

export function HorizontalCard({
  cover,
  priority = false,
  link,
  title,
  markdownExcerpt,
  excerpt,
  subtitle,
  typeLabel,
  date,
  amountOfStories,
  readingTime,
}: CardProps) {
  return (
    <Link
      href={link}
      className="bg-white md:w-fit md:max-w-full dark:bg-gray-800 block overflow-hidden mb-12 xl:mb-12 no-underline prose-headings:text-inherit transform transition-transform duration-300 hover:scale-[1.02] rounded-lg"
    >
      <div className="md:grid md:grid-cols-[15rem_auto]">
        <div className="h-72 w-full md:h-auto md:w-auto relative not-prose max-w-full">
          <ImageWithLoader
            src={cover.src}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            // The image sits in the fixed 15rem grid column at md+, and spans
            // the padded page width below it. `calc(100vw-24px)` (no spaces) is
            // a CSS parse error, which invalidates the whole sizes attribute
            // and makes the browser fall back to 100vw.
            sizes="(max-width: 768px) calc(100vw - 24px), 240px"
            priority={priority}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="p-5 lg:pl-10 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700 prose-headings:mt-2 prose-p:text-zinc-800 dark:prose-p:text-slate-300 w-fit font-normal">
          <div className="max-w-prose">
            <div className="flex items-start justify-between gap-3">
              {title && <h2 className="pt-0 mb-2! font-bold leading-snug grow">{title}</h2>}
              {typeLabel && (
                <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide px-3 py-1 mt-2 not-prose">
                  {typeLabel}
                </span>
              )}
            </div>
            {subtitle && <p className="font-normal text-base my-0!">{subtitle}</p>}
            {(markdownExcerpt || excerpt) && (
              <div className={excerptClassName}>
                {markdownExcerpt ? <MDXExcerpt source={markdownExcerpt} /> : <p>{excerpt}</p>}
              </div>
            )}

            <MetadataDisplay
              date={date}
              readingTime={readingTime}
              amountOfStories={amountOfStories}
              withAuthorInfo={false}
              longFormDate={false}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export const VerticalCard = ({
  cover,
  link,
  title,
  subtitle,
  markdownExcerpt,
  date,
  readingTime,
  coverAspect = "tall",
}: CardProps) => {
  return (
    <Link
      className="w-full flex flex-col align-self-stretch whitespace-no-wrap mt-2 no-underline prose-headings:text-inherit transform transition-transform duration-300 hover:scale-[1.02] rounded-lg bg-white dark:bg-gray-800"
      href={link}
    >
      <div
        className={clsx(
          "w-full relative not-prose max-w-full rounded-t-lg overflow-hidden",
          coverAspect === "video" ? "aspect-video" : "h-72",
        )}
      >
        <ImageWithLoader
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          // Same missing-whitespace calc() bug as HorizontalCard above: without
          // the spaces these are parse errors and the whole attribute is
          // dropped, so every card fetched a 100vw-sized variant.
          sizes="(max-width: 768px) calc(100vw - 24px), (max-width: 1092px) calc(50vw - 40px), 325px"
          className="object-cover rounded-t-lg w-full h-full"
        />
      </div>
      <div className="flex flex-col grow align-self-stretch p-3 min-h-fit prose-p:text-zinc-800 dark:prose-p:text-slate-300 w-full border-r-4 border-l-4 border-b-4 rounded-bl-lg rounded-br-lg border-gray-200 dark:border-gray-700">
        <h2 className="mt-4! mb-2! tracking-tight">{title}</h2>
        {subtitle && <p className="font-normal text-base my-0!">{subtitle}</p>}
        {markdownExcerpt && (
          <div className={excerptClassName}>
            <MDXExcerpt source={markdownExcerpt} />
          </div>
        )}
        <div className="grow mb-5" />
        <div className="place-self-end">
          <MetadataDisplay
            date={date}
            readingTime={readingTime}
            withAuthorInfo={false}
            longFormDate={false}
          />
        </div>
      </div>
    </Link>
  );
};
