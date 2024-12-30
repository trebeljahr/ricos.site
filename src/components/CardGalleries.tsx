import { useWindowWidth } from "@react-hook/window-size";
import {
  createRef,
  FC,
  UIEvent,
  UIEventHandler,
  useEffect,
  useMemo,
  useState,
  WheelEventHandler,
} from "react";
import { FaChevronRight } from "react-icons/fa";
import { FaChevronLeft } from "react-icons/fa6";
import { NiceCardSmall } from "./NiceCard";
import { CommonMetadata } from "src/lib/utils";

export type CardGalleryProps = {
  content: CommonMetadata[];
  withExcerpt?: boolean;
};

export const CardGallery = ({ content, withExcerpt }: CardGalleryProps) => {
  return (
    <div className="grid gap-2 md:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-max  justify-items-center pb-5">
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

export const ScrollableCardGallery: FC<CardGalleryProps> = ({
  content,
  withExcerpt = false,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const width = useWindowWidth();

  const itemsPerPage = useMemo(() => {
    if (width > 1920) return 4;
    if (width > 1280) return 3;
    if (width > 768) return 2;
    return 1;
  }, [width]);

  const itemsScrolledPerClick = 1;

  const scrollRef = createRef<HTMLDivElement>();
  const [showButtons, setShowButtons] = useState({
    left: false,
    right: true,
  });

  const scrollHandler: WheelEventHandler<HTMLDivElement> = (event) => {
    const elementWidth = scrollRef.current?.children[0].clientWidth;

    if (!scrollRef.current || !elementWidth) return;
    if (
      Math.abs(event.deltaY) === 0 &&
      Math.abs(event.deltaX) > 2 &&
      !scrolled
    ) {
      return setScrolled(true);
    }

    // setScrolled(true);
    setShowButtons({
      left: scrollRef.current.scrollLeft >= elementWidth,
      right:
        scrollRef.current.scrollLeft <=
        elementWidth * (content.length - itemsPerPage - 1),
    });
  };

  const handleScrolling = useMemo(
    () => (direction: "left" | "right") => {
      const elementWidth = scrollRef.current?.children[0].clientWidth;
      if (!elementWidth) return;

      const singleOffset = direction === "left" ? -elementWidth : elementWidth;
      const offset = singleOffset * itemsScrolledPerClick;

      scrollRef.current?.scrollTo({
        left: scrollRef.current.scrollLeft + offset,
        behavior: "smooth",
      });
    },
    [itemsScrolledPerClick, scrollRef]
  );

  const handlePrevious = () => {
    handleScrolling("left");
  };

  const handleNext = useMemo(
    () => () => handleScrolling("right"),
    [handleScrolling]
  );

  useEffect(() => {
    if (scrolled || hovering) return;

    const scrollRefElem = scrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const attrib = entry.target.getAttribute("data-interval-id");

          if (entry.isIntersecting) {
            const intervalId = setInterval(() => {
              handleNext();
            }, 5000);

            attrib === null && setTimeout(handleNext, 1000);

            entry.target.setAttribute(
              "data-interval-id",
              intervalId.toString()
            );
          } else {
            const intervalId = entry.target.getAttribute("data-interval-id");
            if (intervalId) {
              clearInterval(Number(intervalId));
              entry.target.removeAttribute("data-interval-id");
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (scrollRefElem) {
      observer.observe(scrollRefElem);
    }

    return () => {
      if (scrollRefElem) {
        observer.unobserve(scrollRefElem);
      }
    };
  }, [handleNext, scrollRef]);

  return (
    <div className="flex place-items-center relative mb-10 xl:mb-0 w-full">
      <div
        className="-ml-3 overflow-x-scroll w-full overscroll-x-none snap-x snap-mandatory flex transition-transform duration-300 ease-in-out pb-5 no-scrollbar"
        ref={scrollRef}
        onWheel={scrollHandler}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {content.map((singlePiece, index) => (
          <div
            key={singlePiece.link}
            id={singlePiece.slug}
            data-index={index}
            className="px-3 flex self-stretch w-full md:w-1/2 xl:w-1/3 3xl:w-1/4 snap-start shrink-0"
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
        className={`absolute left-0 top-full xl:left-[-70px] xl:top-1/2 z-20 h-fit xl:mx-2 rounded-full bg-gray-200 dark:bg-gray-900 p-1 ${
          showButtons.left ? "opacity-1" : "opacity-0"
        }`}
        onClick={handlePrevious}
        disabled={!showButtons.left}
        aria-label="Previous card"
      >
        <FaChevronLeft className="h-4 w-4" />
      </button>
      <button
        className={`absolute right-6 top-full xl:right-[-40px] xl:top-1/2 z-20 h-fit xl:mx-2 rounded-full bg-gray-200 dark:bg-gray-900 p-1 ${
          showButtons.right ? "opacity-1" : "opacity-0"
        }`}
        onClick={handleNext}
        disabled={!showButtons.right}
        aria-label="Next card"
      >
        <FaChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
