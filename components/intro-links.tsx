import Link from "next/link";

export const TrySomeOfThese = () => {
  return (
    <p>
      Maybe try one of these:{" "}
      <Link as="/posts" href="/posts">
        <a className="colored-link">Posts</a>
      </Link>
      ,{" "}
      <Link as="/booknotes" href="/booknotes">
        <a className="colored-link">Booknotes</a>
      </Link>
      , or{" "}
      <Link as="/needlestack" href="/needlestack">
        <a className="colored-link">Needlestack</a>
      </Link>
    </p>
  );
};
