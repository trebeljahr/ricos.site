"use client";

import { useWindowSize } from "@react-hook/window-size";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import { FaChevronLeft } from "react-icons/fa6";
import { useSwipeable } from "react-swipeable";
import { CommonMetadata } from "src/lib/utils";
import { NiceCardSmall } from "./NiceCard";

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

  const [width] = useWindowSize();

  useEffect(() => {
    if (carouselRef.current) {
      const itemWidth = 100 / content.length;
      carouselRef.current.style.transform = `translateX(-${
        currentIndex * itemWidth
      }%)`;

      const currentItemsPerPage =
        width > 1280
          ? itemsPerPage.xl
          : width > 1024
          ? itemsPerPage.lg
          : width > 768
          ? itemsPerPage.md
          : itemsPerPage.sm;

      carouselRef.current.style.width = `${
        (content.length / currentItemsPerPage) * 100
      }%`;
    }
  }, [currentIndex, itemsPerPage, content, width]);

  return (
    <div className="relative px-10">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-4xl font-bold mb-6 mx-auto w-fit">{title}</h2>
      </div>

      <div className="overflow-hidden" {...handlers}>
        <div
          ref={carouselRef}
          className="flex transition-transform duration-300 ease-in-out pb-10"
        >
          {content.map((singlePiece, index) => (
            <div
              key={singlePiece.link}
              className="flex w-full md:w-1/2 lg:w-1/3 xl:w-1/4 px-2 sm:px-4"
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
