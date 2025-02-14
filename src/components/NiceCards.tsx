import { ImageWithLoader } from "@components/ImageWithLoader";
import { MDXRemote } from "next-mdx-remote";
import Link from "next/link";
import { MDXResult } from "src/@types";
import { MetadataDisplay } from "./MetadataDisplay";
import { CommonMetadata } from "src/lib/utils";

type CardProps = {
  cover: CommonMetadata["cover"];
  link: string;
  title: string;
  excerpt?: string;
  markdownExcerpt?: MDXResult;
  subtitle?: string;
  priority?: boolean;
  bigImage?: boolean;
  amountOfStories?: number;
  date?: string;
  readingTime?: number;
};

export function HorizontalCard({
  cover,
  priority = false,
  link,
  title,
  markdownExcerpt,
  excerpt,
  subtitle,
  date,
  amountOfStories,
  readingTime,
}: CardProps) {
  return (
    <Link
      href={link}
      className="bg-white w-fit max-w-full dark:bg-gray-800 block overflow-hidden mb-12 xl:mb-12 no-underline prose-headings:text-inherit transform transition-transform duration-300 hover:scale-[1.02] rounded-lg"
    >
      <div
        className="md:grid"
        style={{
          gridTemplateColumns: "15rem auto",
        }}
      >
        <div className="h-72 w-full md:h-auto md:w-auto relative not-prose max-w-full">
          <ImageWithLoader
            src={cover.src}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            sizes={`(max-width: 768px) 100vw, (max-width: 1092px) 20vw`}
            priority={priority}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="p-5 lg:pl-10 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700 prose-headings:mt-2 prose-p:text-zinc-800 dark:prose-p:text-slate-300 w-fit font-normal">
          <div className="max-w-prose">
            {title && <h2 className="pt-0 font-bold leading-snug">{title}</h2>}
            {subtitle && <p className="font-normal text-base">{subtitle}</p>}
            {markdownExcerpt ? (
              <MDXRemote {...markdownExcerpt} />
            ) : excerpt ? (
              <p>{excerpt}</p>
            ) : null}

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
}: CardProps) => {
  return (
    <Link
      className="w-full flex flex-col align-self-stretch whitespace-no-wrap mt-2 no-underline prose-headings:text-inherit transform transition-transform duration-300 hover:scale-[1.02] rounded-lg bg-white dark:bg-gray-800"
      href={link}
    >
      <div className="h-72 w-full relative not-prose max-w-full rounded-t-lg overflow-hidden">
        <ImageWithLoader
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes={`(max-width: 768px) 100vw, (max-width: 1092px) 50vw, 325px`}
          className="object-cover rounded-t-lg w-full h-full"
        />
      </div>
      <div className="flex flex-col flex-grow align-self-stretch p-3 min-h-fit prose-p:text-zinc-800 dark:prose-p:text-slate-300 w-full border-r-4 border-l-4 border-b-4 rounded-bl-lg rounded-br-lg border-gray-200 dark:border-gray-700">
        <h2 className="!my-6 tracking-tight">{title}</h2>
        {subtitle && <p className="font-normal text-base">{subtitle}</p>}
        {markdownExcerpt && <MDXRemote {...markdownExcerpt} />}
        <div className="flex-grow mb-5"></div>
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
