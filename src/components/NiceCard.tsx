import { ImageWithLoader } from "@components/ImageWithLoader";
import Link from "next/link";
import { CommonMetadata } from "src/lib/utils";
import { MetadataDisplay } from "./DateFormatter";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSwipeable } from "react-swipeable";
import { FaChevronLeft } from "react-icons/fa6";
import { FaChevronRight } from "react-icons/fa";
import { useWindowSize } from "src/hooks/useWindowSize";

type NiceCardProps = {
  cover: { src: string; alt: string };
  link: string;
  title: string;
  excerpt: string;
  priority?: boolean;
  bigImage?: boolean;
  date: string;
  readingTime: number;
  withExcerpt?: boolean;
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 25vw"
            priority={priority}
            className="object-cover"
          />
        </div>
        <div className="p-1 md:p-5 md:border-t-4 md:border-r-4 md:border-b-4 max-md:rounded-bl-lg max-md:rounded-br-lg md:rounded-tr-lg md:rounded-br-lg border-gray-200 dark:border-gray-700 prose-headings:mt-2 prose-p:text-zinc-800 dark:prose-p:text-slate-300 max-w-full">
          <h2 className="pt-0 font-bold leading-snug">{title}</h2>
          <p className="break-words text-ellipsis w-full">{excerpt}</p>
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
}

type CardGalleryProps = {
  title: string;
  content: CommonMetadata[];
  withExcerpt?: boolean;
};

export const SmallCardsGallerySingleRow = ({
  title,
  content,
  withExcerpt = false,
}: CardGalleryProps) => {
  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <h2 className="justify-self-start text-5xl col-span-1 md:col-span-2 lg:col-span-3 mb-4">
          {title}
        </h2>
      </div>

      <div className="mx-auto flex flex-nowrap mb-10 justify-items-center gap-2 overflow-x-scroll overflow-y-visible">
        {content.map((singlePiece) => (
          <div className="w-5/12" key={singlePiece.slug}>
            <NiceCardSmall
              readingTime={singlePiece.metadata.readingTime}
              withExcerpt={withExcerpt}
              {...singlePiece}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SmallCardsGallery = ({
  title,
  content,
  withExcerpt = false,
}: CardGalleryProps) => {
  return (
    <div className="mx-auto max-w-3xl grid gap-2 md:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-max mb-10 justify-items-center">
      <h2 className="justify-self-start text-5xl col-span-1 md:col-span-2 lg:col-span-3 mb-4">
        {title}
      </h2>
      {content.map((singlePiece) => (
        <NiceCardSmall
          key={singlePiece.slug}
          readingTime={singlePiece.metadata.readingTime}
          withExcerpt={withExcerpt}
          {...singlePiece}
        />
      ))}
    </div>
  );
};

export const NiceCardSmall = ({
  cover,
  link,
  title,
  excerpt,
  date,
  readingTime,
  withExcerpt,
}: NiceCardProps) => {
  return (
    <Link
      className="w-full flex flex-col align-self-stretch whitespace-no-wrap mt-2 no-underline prose-headings:text-inherit transform transition-transform duration-300 hover:scale-[1.02] rounded-lg bg-white dark:bg-gray-800"
      href={link}
    >
      <div className="h-40 relative not-prose max-w-full rounded-t-lg overflow-hidden">
        <ImageWithLoader
          src={cover.src}
          alt={cover.alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover rounded-t-lg"
        />
      </div>
      <div className="flex flex-col flex-grow align-self-stretch p-3 min-h-fit prose-p:text-zinc-800 dark:prose-p:text-slate-300 w-full border-r-4 border-l-4 border-b-4 rounded-bl-lg rounded-br-lg border-gray-200 dark:border-gray-500">
        <h2 className="mt-2 mb-2 tracking-tight text-lg">{title}</h2>
        {withExcerpt && <p>{excerpt}</p>}
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

type SwipeableCardCarouselProps = {
  title: string;
  content: CommonMetadata[];
  withExcerpt?: boolean;
};

export const SwipeableCardCarousel: React.FC<SwipeableCardCarouselProps> = ({
  title,
  content,
  withExcerpt = false,
}) => {
  const itemsPerPage = useMemo(
    () => ({
      sm: 1,
      md: 2,
      lg: 3,
      xl: 4,
    }),
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const showPrevious = currentIndex > 0;
  const showNext = content && currentIndex < content.length - itemsPerPage.lg;

  const handlers = useSwipeable({
    onSwipedLeft: () => showNext && handleNext(),
    onSwipedRight: () => showPrevious && handlePrevious(),
    trackMouse: true,
  });

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      Math.min(content.length - itemsPerPage.lg, prevIndex + 1)
    );
  };

  useEffect(() => {
    if (carouselRef.current) {
      const itemWidth = 100 / content.length;
      carouselRef.current.style.transform = `translateX(-${
        currentIndex * itemWidth
      }%)`;
    }
  }, [currentIndex, itemsPerPage, content]);

  const { width } = useWindowSize();

  if (!width) return null;

  const currentItemsPerPage =
    width > 1024
      ? itemsPerPage.xl
      : width > 768
      ? itemsPerPage.lg
      : width > 640
      ? itemsPerPage.md
      : itemsPerPage.sm;

  return (
    <div className="relative px-10">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-4xl font-bold mb-6 mx-auto w-fit">{title}</h2>
      </div>

      <div className="overflow-hidden" {...handlers}>
        <div
          ref={carouselRef}
          className="flex transition-transform duration-300 ease-in-out pb-10"
          style={{ width: `${(content.length / currentItemsPerPage) * 100}%` }}
        >
          {content.map((singlePiece, index) => (
            <div
              key={singlePiece.link}
              className="flex w-full sm:w-1/2 md:w-1/3 lg:w-1/4 px-2 sm:px-4"
            >
              <NiceCardSmall
                {...singlePiece}
                withExcerpt={withExcerpt}
                readingTime={singlePiece.metadata.readingTime}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-1/2 left-0 right-0 flex justify-between items-center px-4 -mt-6">
        <button
          className={`rounded-full bg-gray-200 dark:bg-gray-900 p-1 ${
            showPrevious ? "opacity-100" : "opacity-0"
          }`}
          onClick={handlePrevious}
          disabled={!showPrevious}
          aria-label="Previous card"
        >
          <FaChevronLeft className="h-4 w-4" />
        </button>
        <button
          className={`rounded-full bg-gray-200 dark:bg-gray-900 p-1 ${
            showNext ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleNext}
          disabled={!showNext}
          aria-label="Next card"
        >
          <FaChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
