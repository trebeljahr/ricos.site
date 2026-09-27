import { GlitterPool, useGlitter } from "@components/Glitter";
import { FiArrowLeft, FiArrowRight } from "@components/Icons";
import { ShowAfterScrolling } from "@components/ShowAfterScrolling";
import Link from "next/link";
import { useRouter } from "next/router";

const arrowStyles =
  "fixed flex place-items-center w-fit h-fit z-10 bottom-[2vmin] text-black! bg-blue-300 no-underline xl:top-[50%] p-1 hover:bg-blue-400 motion-safe:transition-[translate,scale,background-color] motion-safe:duration-150 motion-safe:ease-out active:scale-90";

export const NextAndPrevArrows = ({
  nextPost,
  prevPost,
}: {
  nextPost: null | number | string;
  prevPost: null | number | string;
}) => {
  const router = useRouter();
  const currentPath = router.asPath;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));

  const prevGlitter = useGlitter();
  const nextGlitter = useGlitter();

  return (
    <ShowAfterScrolling howFarDown={20}>
      <>
        {prevPost && (
          <Link
            href={`${basePath}/${prevPost}`}
            // The glitter flies the way the link goes, so the two arrows read as a pair.
            onClick={() => prevGlitter.burst("left")}
            className={`${arrowStyles} left-3 xl:left-0 hover:-translate-x-[2px]`}
            passHref
          >
            <GlitterPool ref={prevGlitter.glitterRef} />
            <FiArrowLeft className="w-8 h-8" />
          </Link>
        )}
        {nextPost && (
          <Link
            href={`${basePath}/${nextPost}`}
            onClick={() => nextGlitter.burst("right")}
            className={`${arrowStyles} max-xl:left-14 xl:right-0 hover:translate-x-[2px]`}
            passHref
          >
            <GlitterPool ref={nextGlitter.glitterRef} />
            <FiArrowRight className="w-8 h-8" />
          </Link>
        )}
      </>
    </ShowAfterScrolling>
  );
};
