import Link from "next/link";
import { ShowAfterScrolling } from "@components/ShowAfterScrolling";

export const NextAndPrevArrows = ({
  nextPost,
  prevPost,
}: {
  nextPost: null | number;
  prevPost: null | number;
}) => {
  return (
    <ShowAfterScrolling>
      <>
        {prevPost && (
          <Link
            href={`/newsletters/${prevPost}`}
            className="page-arrow left"
            passHref
          >
            <span className="icon-arrow-left" />
          </Link>
        )}
        {nextPost && (
          <Link
            href={`/newsletters/${nextPost}`}
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
