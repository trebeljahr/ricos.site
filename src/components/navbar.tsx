import Link from "next/link";
import Intro from "./intro";
import { useRouter } from "next/router";
import {
  CSSProperties,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { useWindowSize } from "../hooks/useWindowSize";

interface Props {
  intro?: boolean;
}

function Dropdown({ children }: { children?: JSX.Element[] }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    setExpanded((old) => !old);
  };

  return (
    <div className="navbarDropdown">
      <button onClick={toggle}>
        {expanded ? (
          <>
            less <span className="icon-triangle-up"></span>
          </>
        ) : (
          <>
            more <span className="icon-triangle-down"></span>
          </>
        )}
      </button>
      {expanded && <div className="navbarDropdownContent">{children}</div>}
    </div>
  );
}

type NavlinksProps = {
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
};

export function Navlinks({ expanded, setExpanded }: NavlinksProps) {
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

  const close = (link: string) => {
    if (router.pathname.startsWith(link)) {
      setExpanded(false);
    }
  };
  const SingleNavLink = ({ to }: { to: string }) => {
    const link = `/${to}`;
    return (
      <li>
        <Link as={link} href={link}>
          <a onClick={() => close(link)} style={activeStyle(link)}>
            {to}
          </a>
        </Link>
      </li>
    );
  };

  if (!expanded) return null;
  return (
    <>
      <SingleNavLink to="posts" />
      <SingleNavLink to="library" />
      <SingleNavLink to="needlestack" />
      <SingleNavLink to="principles" />
      <SingleNavLink to="quotes" />
      <SingleNavLink to="now" />
      <SingleNavLink to="1-month-projects" />
    </>
  );
}

export function Navbar({ intro = true }: Props) {
  const { width } = useWindowSize();
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    setExpanded(width ? width > 1030 : false);
  }, [width]);
  return (
    <nav role="navigation" className="primary-navigation">
      <div className="navbar-controls">
        {intro && <Intro withLink={true} withMotto={false}></Intro>}

        <button
          className="navlink-expander"
          onClick={() => setExpanded(!expanded)}
        >
          <span className={expanded ? "icon-close" : "icon-bars"} />
        </button>
      </div>
      <ul>
        <Navlinks expanded={expanded} setExpanded={setExpanded} />
      </ul>
    </nav>
  );
}
