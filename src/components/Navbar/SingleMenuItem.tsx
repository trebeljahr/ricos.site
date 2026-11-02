import Link from "next/link";
import { useRouter } from "next/router";
import type { MouseEvent } from "react";
import { isSameLocalUrl } from "src/lib/urlUtils";
import type { NavItem } from "./navItems";

type SingleMenuItemProps = {
  link: NavItem;
  menuOpen: boolean;
  onSelect?: () => void;
};

export function SingleMenuItem({ link, menuOpen, onSelect }: SingleMenuItemProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const isPlainPrimaryClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

    if (isPlainPrimaryClick && isSameLocalUrl(router.asPath, link.href)) {
      event.preventDefault();
    }

    onSelect?.();
  };

  return (
    // A closed menu still counts as visible to next/link, so without this every page
    // on the site would download the code of every page in the menus. Opening a menu
    // loads its pages, ahead of the click.
    <Link
      href={link.href}
      prefetch={menuOpen}
      className="block whitespace-nowrap rounded-md px-3 py-2 text-left transition-colors duration-300 ease-out hover:bg-accent/10 hover:text-accent motion-reduce:transition-none"
      onClick={handleClick}
    >
      {link.label}
    </Link>
  );
}
