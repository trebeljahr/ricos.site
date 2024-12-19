import { ImageWithLoader } from "@components/ImageWithLoader";
import Link from "next/link";
import { MetadataDisplay } from "./DateFormatter";

type NiceCardProps = {
  cover: { src: string; alt: string };
  link: string;
  title: string;
  excerpt: string;
  priority?: boolean;
  bigImage?: boolean;
  date: string;
  readingTime: number;
};

export function NiceCard({
  cover,
  priority = false,
  link,
  title,
  excerpt,
  date,
  readingTime,
}: NiceCardProps) {
  return (
    <Link
      href={link}
      className="bg-white max-w-full dark:bg-gray-800 block overflow-hidden mb-12 lg:mb-12 no-underline prose-headings:text-inherit transform transition-transform duration-300 hover:scale-[1.02] rounded-lg"
    >
      <div
        className="md:grid"
        style={{
          gridTemplateColumns: "15rem auto",
        }}
      >
        <div className="h-64 md:h-full relative not-prose max-w-full">
          <ImageWithLoader
            src={cover.src}
            alt={cover.alt}
            fill
            sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
              priority ? "780px" : "357px"
            }`}
            priority={priority}
            className="object-cover"
          />
        </div>
        <div className="p-5 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700 prose-headings:mt-2 prose-p:text-zinc-800 dark:prose-p:text-slate-300 max-w-full">
          <h2 className="pt-0 font-bold leading-snug">{title}</h2>
          <p className="break-words text-ellipsis w-full">{excerpt}</p>
          <MetadataDisplay
            date={date}
            readingTime={readingTime}
            withAuthorInfo={false}
          />
        </div>
      </div>
    </Link>
  );
}
