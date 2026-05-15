import clsx from "clsx";
import Link from "next/link";
import type { NavItem } from "./navItems";

type SingleMenuItemProps = {
  link: NavItem;
  onSelect?: () => void;
  left?: boolean;
};

export function SingleMenuItem({ link, onSelect, left }: SingleMenuItemProps) {
  return (
    <Link
      href={link.href}
      role="menuitem"
      className={clsx(
        "block px-4 py-2 break-keep whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700",
        left ? "text-left" : "text-right",
      )}
      onClick={onSelect}
    >
      {link.label}
    </Link>
  );
}
