import Link from "next/link";

export const TrySomeOfThese = () => {
  return (
    <p>
      For now, you can try one of these:{" "}
      <Link as="/posts" href="/posts">
        <a className="colored-link">/posts</a>
      </Link>
      ,{" "}
      <Link as="/booknotes" href="/booknotes">
        <a className="colored-link">/booknotes</a>
      </Link>
      , or{" "}
      <Link as="/needlestack" href="/needlestack">
        <a className="colored-link">/needlestack</a>
      </Link>
    </p>
  );
};
