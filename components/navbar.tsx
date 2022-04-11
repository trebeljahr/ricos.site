import Link from "next/link";
import Intro from "./intro";

interface Props {
  intro?: boolean;
}

export function Navbar({ intro = true }: Props) {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        {intro && <Intro withLink={true} withMotto={false}></Intro>}
        <div className="navlinks">
          <Link as="/books" href="/books">
            <a>books</a>
          </Link>
          <Link as="/about" href="/about">
            <a>about</a>
          </Link>
          <Link as="/now" href="/now">
            <a>now</a>
          </Link>
          <Link as="/needlestack" href="/needlestack">
            <a>needlestack</a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
