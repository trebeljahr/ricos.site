import Link from "next/link";
import Intro from "./intro";
import { useRouter } from "next/router";
import { useState } from "react";

interface Props {
  intro?: boolean;
}

export function Navlinks({ expanded }: { expanded: boolean }) {
  const router = useRouter();
  const activeStyle = (link: string, { exact = false } = {}) => {
    let isUnderlined = router.pathname.startsWith(link);
    if (exact) {
      isUnderlined = router.pathname === link;
    }

    return {
      textDecoration: isUnderlined ? "underline" : "none",
    };
  };
  return (
    <div className={"navlinks" + (expanded ? " expanded" : "")}>
      <Link as="/posts" href="/posts">
        <a style={activeStyle("/posts")}>posts</a>
      </Link>
      <Link as="/booknotes" href="/booknotes">
        <a style={activeStyle("/booknotes")}>booknotes</a>
      </Link>

      <Link as="/needlestack" href="/needlestack">
        <a style={activeStyle("/needlestack")}>needlestack</a>
      </Link>
      <Link as="/quotes" href="/quotes">
        <a style={activeStyle("/quotes")}>quotes</a>
      </Link>
      <Link as="/now" href="/now">
        <a style={activeStyle("/now")}>now</a>
      </Link>
      {/* 
          
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
  );
}

export function Navbar({ intro = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-controls">
          {intro && <Intro withLink={true} withMotto={false}></Intro>}
          <button
            className="navlink-expander"
            onClick={() => setExpanded(!expanded)}
          >
            <span className={expanded ? "icon-close" : "icon-bars"} />
          </button>
        </div>
        <Navlinks expanded={expanded} />
      </div>
    </nav>
  );
}
