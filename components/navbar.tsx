import Link from "next/link";
import Intro from "./intro";

interface Props {
  withLink?: boolean;
  withMotto?: boolean;
}

export function Navbar({ withLink, withMotto }: Props) {
  return (
    <nav className="navbar">
      <Intro withLink={withLink} withMotto={withMotto}></Intro>
      <div className="navLinks">
        <Link as="/books" href="/books">
          <a>
            <h2>Books</h2>
          </a>
        </Link>
      </div>
    </nav>
  );
}
