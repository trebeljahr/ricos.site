import { Menu, MenuItem } from "@headlessui/react";
import clsx from "clsx";
import Link from "next/link";

type SingleMenuItemProps = {
  link: string;
  closeNav?: () => void;
  left?: boolean;
};

export function SingleMenuItem({ link, closeNav, left }: SingleMenuItemProps) {
  return (
    <MenuItem>
      {({ close }) => (
        <Link
          href={`/${link}`}
          className={clsx(
            "block px-4 py-2 break-keep whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700",
            left ? "text-left" : "text-right"
          )}
          onClick={() => {
            closeNav && closeNav();
            close();
          }}
        >
          {link}
        </Link>
      )}
    </MenuItem>
  );
}
