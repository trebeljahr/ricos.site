import Link from "next/link";
import { useRouter } from "next/router";
import type { MouseEvent } from "react";
import { isSameLocalUrl } from "src/lib/urlUtils";
import type { NavItem } from "./navItems";

type SingleMenuItemProps = {
  link: NavItem;
  onSelect?: () => void;
};

export function SingleMenuItem({ link, onSelect }: SingleMenuItemProps) {
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
    <Link
      href={link.href}
      className="block whitespace-nowrap rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={handleClick}
    >
      {link.label}
    </Link>
  );
}
