import Link from "next/link";

export const TrySomeOfThese = () => {
  return (
    <p>
      For now, you can try one of these:{" "}
      <Link as="/posts" href="/posts">
        /posts
      </Link>
      ,{" "}
      <Link as="/booknotes" href="/booknotes">
        /booknotes
      </Link>
      , or{" "}
      <Link as="/needlestack" href="/needlestack">
        /needlestack
      </Link>
      .
    </p>
  );
};
