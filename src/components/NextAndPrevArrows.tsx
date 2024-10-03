import Link from "next/link";
import { ShowAfterScrolling } from "@components/ShowAfterScrolling";
import { useRouter } from "next/router";
import React from "react";

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
            className="page-arrow left"
            passHref
          >
            <span className="icon-arrow-left" />
          </Link>
        )}
        {nextPost && (
          <Link
            href={`${basePath}/${nextPost}`}
            className="page-arrow right"
            passHref
          >
            <span className="icon-arrow-right" />
          </Link>
        )}
      </>
    </ShowAfterScrolling>
  );
};
