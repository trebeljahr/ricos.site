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
            className="page-arrow left no-underline"
            passHref
          >
            <FiArrowLeft />
          </Link>
        )}
        {nextPost && (
          <Link
            href={`${basePath}/${nextPost}`}
            className="page-arrow right no-underline"
            passHref
          >
            <FiArrowRight />
          </Link>
        )}
      </>
    </ShowAfterScrolling>
  );
};
