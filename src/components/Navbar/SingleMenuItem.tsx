import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/router";
import type { MouseEvent } from "react";
import { isSameLocalUrl } from "src/lib/urlUtils";
import type { NavItem } from "./navItems";

type SingleMenuItemProps = {
  link: NavItem;
  onSelect?: () => void;
  left?: boolean;
};

export function SingleMenuItem({ link, onSelect, left }: SingleMenuItemProps) {
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
      role="menuitem"
      className={clsx(
        "block px-4 py-2 break-keep whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700",
        left ? "text-left" : "text-right",
      )}
      onClick={handleClick}
    >
      {link.label}
    </Link>
  );
}
