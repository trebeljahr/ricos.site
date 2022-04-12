import Link from "next/link";
import Intro from "./intro";
import { useRouter } from "next/router";

interface Props {
  intro?: boolean;
}

export function Navbar({ intro = true }: Props) {
  const router = useRouter();
  const activeStyle = (link: string) => {
    return {
      textDecoration: router.pathname === link ? "underline" : "none",
    };
  };
  return (
    <nav className="navbar">
      <div className="navbar-content">
        {intro && <Intro withLink={true} withMotto={false}></Intro>}
        <div className="navlinks">
          <Link as="/" href="/">
            <a style={activeStyle("/")}>posts</a>
          </Link>
          <Link as="/books" href="/books">
            <a style={activeStyle("/books")}>notes</a>
          </Link>

          <Link as="/needlestack" href="/needlestack">
            <a style={activeStyle("/needlestack")}>needlestack</a>
          </Link>
          <Link as="/quotes" href="/quotes">
            <a style={activeStyle("/quotes")}>quotes</a>
          </Link>
          {/* 
          <Link as="/now" href="/now">
            <a style={activeStyle("/now")}>now</a>
          </Link>
          <Link as="/coding" href="/coding">
            <a style={activeStyle("/coding")}>coding</a>
          </Link>
          <Link as="/photography" href="/photography">
            <a style={activeStyle("/photography")}>photography</a>
          </Link>
          <Link as="/contact" href="/contact">
            <a style={activeStyle("/contact")}>contact</a>
          </Link> */}
        </div>
      </div>
    </nav>
  );
}
