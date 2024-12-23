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

  const [currentIndex, setCurrentIndex] = useState(itemsPerPage - 1);
  const scrollRef = React.createRef<HTMLDivElement>();

  const showPrevious = currentIndex >= itemsPerPage;
  const showNext = content && currentIndex <= content.length - itemsPerPage - 1;

  const scrollToCurrentIndex = (index: number) => {
    const contentSlug = content[index]?.slug;
    console.log(contentSlug);
    if (!contentSlug) return;

    const element = document.getElementById(contentSlug);

    if (!element) return;

    console.log("scrolling");

    // element.scrollTo;
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handlePrevious = () => {
    // const nextIndex = Math.max(
    //   0,
    //   Math.min(
    //     currentIndex - itemsScrolledPerClick,
    //     content.length - itemsPerPage - 1
    //   )
    // );
    // console.log("scrolling left to", nextIndex);

    // // setCurrentIndex(nextIndex);
    // scrollToCurrentIndex(nextIndex);

    const elementWidth = scrollRef.current?.children[0].clientWidth;
    if (!elementWidth) return;

    scrollRef.current?.scrollTo({
      left: scrollRef.current.scrollLeft - elementWidth,
      behavior: "smooth",
    });
  };

  const handleNext = () => {
    // const nextIndex = Math.min(
    //   content.length - 1,
    //   Math.max(currentIndex + itemsScrolledPerClick, itemsPerPage)
    // );
    // console.log("scrolling right to", nextIndex);
    // setCurrentIndex(nextIndex);
    // scrollToCurrentIndex(nextIndex);
    const elementWidth = scrollRef.current?.children[0].clientWidth;
    if (!elementWidth) return;

    scrollRef.current?.scrollTo({
      left: scrollRef.current.scrollLeft + elementWidth,
      behavior: "smooth",
    });
  };

  console.log(currentIndex);

  useEffect(() => {
    function determineElementsInView() {
      const elements = document.querySelectorAll(".carousel-item");
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((entry) => entry.isIntersecting);

          // console.log(entries);

          const indices = visible.map((entry) =>
            Number(entry.target.getAttribute("data-index"))
          );

          const index = [...indices].pop();
          if (index) {
            // const updateIndex = Math.min(
            //   content.length - itemsPerPage - 1,
            //   Math.max(itemsPerPage, index)
            // );
            // console.log(updateIndex);
            setCurrentIndex(index);
          }
        },
        {
          root: scrollRef.current,
          threshold: 0.9, // Adjust this value as needed
        }
      );

      elements.forEach((element) => observer.observe(element));

      return () => {
        elements.forEach((element) => observer.unobserve(element));
      };
    }

    return determineElementsInView();
  }, [content]);

  return (
    <div className="relative">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold mb-6 w-fit">{title}</h2>
      </div>

      <div className="flex place-items-center">
        <button
          className={`h-fit rounded-full bg-gray-200 dark:bg-gray-900 p-1 ${
            showPrevious ? "opacity-100" : "opacity-0"
          }`}
          onClick={handlePrevious}
          disabled={!showPrevious}
          aria-label="Previous card"
        >
          <FaChevronLeft className="h-4 w-4" />
        </button>
        <div
          className="overflow-x-scroll w-full overscroll-x-none snap-x flex transition-transform duration-300 ease-in-out pb-10"
          ref={scrollRef}
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
            showNext ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleNext}
          disabled={!showNext}
          aria-label="Next card"
        >
          <FaChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* <div className="absolute top-1/2 left-0 right-0 flex justify-between items-center px-4 -mt-6"></div> */}
    </div>
  );
};
