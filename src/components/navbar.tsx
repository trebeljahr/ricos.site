import { Avatar, Dropdown, Navbar } from "flowbite-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useWindowSize } from "../hooks/useWindowSize";
import Intro from "./intro";

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
      <SingleNavLink to="newsletter" />
      <SingleNavLink to="booknotes" />
      <SingleNavLink to="needlestack" />
      <SingleNavLink to="principles" />
      <SingleNavLink to="quotes" />
      <SingleNavLink to="photography" />
      <SingleNavLink to="now" />
    </>
  );
}

export function CustomNavbar() {
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

function SingleNavLink({ to: link }: { to: string }) {
  const router = useRouter();

  const isActive = () => {
    return router.asPath.startsWith(link);
  };

  return (
    <Navbar.Link href={`/${link}`} active={isActive()}>
      {link}
    </Navbar.Link>
  );
}

export const NewNavbar = () => {
  return (
    <Navbar fluid rounded>
      <Navbar.Brand href="/">
        <img
          alt="Flowbite React Logo"
          className="mr-3 h-6 sm:h-9"
          src="/favicon/apple-touch-icon.png"
        />
        <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
          trebeljahr
        </span>
      </Navbar.Brand>
      <Navbar.Toggle />

      <Navbar.Collapse>
        <Dropdown inline label={"content"}>
          {["posts", "newsletter", "booknotes", "quotes", "podcastnotes"].map(
            (link) => (
              <Dropdown.Item>
                <SingleNavLink to={link} />
              </Dropdown.Item>
            )
          )}

          <Dropdown.Item>
            <SingleNavLink to="needlestack" />
          </Dropdown.Item>

          <Dropdown.Item>
            <SingleNavLink to="principles" />
          </Dropdown.Item>
        </Dropdown>

        <SingleNavLink to="photography" />
        <SingleNavLink to="now" />
      </Navbar.Collapse>
    </Navbar>
  );
};
