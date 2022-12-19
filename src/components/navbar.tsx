import Link from "next/link";
import Intro from "./intro";
import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useWindowSize } from "../hooks/useWindowSize";

type NavlinksProps = {
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
};

export function Navlinks({ expanded, setExpanded }: NavlinksProps) {
  const router = useRouter();

  const activeStyle = (link: string, { exact = false } = {}) => {
    let isUnderlined = router.asPath.startsWith(link);
    if (exact) {
      isUnderlined = router.asPath === link;
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
        <Link
          as={link}
          href={link}
          onClick={() => close(link)}
          style={activeStyle(link)}
        >
          {to}
        </Link>
      </li>
    );
  };

  // if (!expanded) return null;
  // style={{ display: expanded ? "block" : "none" }}
  return (
    <>
      <SingleNavLink to="posts" />
      <SingleNavLink to="booknotes" />
      <SingleNavLink to="needlestack" />
      <SingleNavLink to="principles" />
      <SingleNavLink to="quotes" />
      <SingleNavLink to="now" />
    </>
  );
}

export function Navbar() {
  const { width } = useWindowSize();
  const [expanded, setExpanded] = useState(width ? width > 1030 : true);
  useEffect(() => {
    setExpanded(width ? width > 1030 : true);
  }, [width]);

  const setExpandedOnMobile = () => {
    setExpanded(width ? width > 1030 : false);
  };
  return (
    <>
      {width && (
        <nav role="navigation" className="primary-navigation">
          <div className="navbar-controls">
            <Intro withLink={true} withMotto={false}></Intro>

            <button
              className="navlink-expander"
              onClick={() => setExpanded(!expanded)}
            >
              <span className={expanded ? "icon-close" : "icon-bars"} />
            </button>
          </div>
          {expanded ? (
            <ul className="navlinks">
              <Navlinks expanded={expanded} setExpanded={setExpandedOnMobile} />
            </ul>
          ) : null}
        </nav>
      )}
    </>
  );
}
