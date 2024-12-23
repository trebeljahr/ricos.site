import Link from "next/link";
import { ShowAfterScrolling } from "@components/ShowAfterScrolling";
import { useRouter } from "next/router";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";

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

  return (
    <ShowAfterScrolling>
      <>
        {prevPost && (
          <Link
            href={`${basePath}/${prevPost}`}
            className="fixed flex place-items-center w-fit h-fit z-10 bottom-[2vmin] !text-black bg-blue-300 no-underline xl:top-[50%] left-3 xl:left-0 p-1 hover:bg-blue-400"
            passHref
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
        )}
        {nextPost && (
          <Link
            href={`${basePath}/${nextPost}`}
            className="fixed flex place-items-center w-fit h-fit z-10 bottom-[2vmin] !text-black bg-blue-300 no-underline xl:top-[50%] max-xl:left-10 xl:right-0 p-1 hover:bg-blue-400"
            passHref
          >
            <FiArrowRight className="w-5 h-5" />
          </Link>
        )}
      </>
    </ShowAfterScrolling>
  );
};
