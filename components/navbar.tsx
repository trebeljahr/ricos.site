import Link from "next/link";
import Intro from "./intro";
import { useRouter } from "next/router";

interface Props {
  intro?: boolean;
}

export function Navbar({ intro = true }: Props) {
  const router = useRouter();
  console.log(router.pathname);
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
          <Link as="/now" href="/now">
            <a style={activeStyle("/now")}>now</a>
          </Link>
          <Link as="/needlestack" href="/needlestack">
            <a style={activeStyle("/needlestack")}>needlestack</a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
