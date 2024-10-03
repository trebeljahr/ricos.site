import Link from "next/link";
import React from "react";

export const TrySomeOfThese = () => {
  return (
    <p>
      For now, you can try one of these:{" "}
      <Link as="/posts" href="/posts" className="colored-link">
        /posts
      </Link>
      ,{" "}
      <Link as="/booknotes" href="/booknotes" className="colored-link">
        /booknotes
      </Link>
      , or{" "}
      <Link as="/needlestack" href="/needlestack" className="colored-link">
        /needlestack
      </Link>
      .
    </p>
  );
};
