import React, { useEffect, useMemo, useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import { FaChevronLeft } from "react-icons/fa6";
import { CommonMetadata } from "src/lib/utils";
import { NiceCardSmall } from "./NiceCard";
import { useWindowWidth } from "@react-hook/window-size";

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
  const width = useWindowWidth();

  const itemsPerPage = useMemo(() => {
    if (width > 1280) return 4;
    if (width > 1024) return 3;
    if (width > 768) return 2;
    return 1;
  }, [width]);

  const itemsScrolledPerClick = 1;

  const scrollRef = React.createRef<HTMLDivElement>();
  const [showButtons, setShowButtons] = useState({
    left: false,
    right: true,
  });

  const scrollHandler = () => {
    const elementWidth = scrollRef.current?.children[0].clientWidth;

    // console.log("hi");

    if (!scrollRef.current || !elementWidth) return;

    console.log({
      scrollLeft: scrollRef.current.scrollLeft,
      scrollWidth: scrollRef.current.scrollWidth,
      width: scrollRef.current.clientWidth,
      elementWidth,
    });
    setShowButtons({
      left: scrollRef.current.scrollLeft >= elementWidth,
      right:
        scrollRef.current.scrollLeft <=
        scrollRef.current.scrollWidth - elementWidth * itemsPerPage,
    });
  };

  const handleScrolling = (direction: "left" | "right") => {
    const elementWidth = scrollRef.current?.children[0].clientWidth;
    if (!elementWidth) return;

    const singleOffset = direction === "left" ? -elementWidth : elementWidth;
    const offset = singleOffset * itemsScrolledPerClick;

    scrollRef.current?.scrollTo({
      left: scrollRef.current.scrollLeft + offset,
      behavior: "smooth",
    });
  };

  const handlePrevious = () => {
    handleScrolling("left");
  };

  const handleNext = () => {
    handleScrolling("right");
  };

  return (
    <div className="relative">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold mb-6 w-fit">{title}</h2>
      </div>

      <div className="flex place-items-center">
        <button
          className={`h-fit rounded-full bg-gray-200 dark:bg-gray-900 p-1 ${
            showButtons.left ? "visible" : "hidden"
          }`}
          onClick={handlePrevious}
          disabled={!showButtons.left}
          aria-label="Previous card"
        >
          <FaChevronLeft className="h-4 w-4" />
        </button>
        <div
          className="overflow-x-scroll w-full overscroll-x-none snap-x flex transition-transform duration-300 ease-in-out pb-10"
          ref={scrollRef}
          onScroll={scrollHandler}
        >
          {content.map((singlePiece, index) => (
            <div
              key={singlePiece.link}
              id={singlePiece.slug}
              data-index={index}
              className="flex self-stretch w-full md:w-1/2 lg:w-1/3 xl:w-1/4 snap-start shrink-0 px-3 carousel-item"
            >
              <NiceCardSmall
                {...singlePiece}
                withExcerpt={withExcerpt}
                readingTime={singlePiece.metadata.readingTime}
              />
            </div>
          ))}
        </div>
        <button
          className={`h-fit rounded-full bg-gray-200 dark:bg-gray-900 p-1 ${
            showButtons.right ? "visible" : "hidden"
          }`}
          onClick={handleNext}
          disabled={!showButtons.right}
          aria-label="Next card"
        >
          <FaChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* <div className="absolute top-1/2 left-0 right-0 flex justify-between items-center px-4 -mt-6"></div> */}
    </div>
  );
};
