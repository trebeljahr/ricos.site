import React from "react";
import { Menu } from "@headlessui/react";
import Link from "next/link";

type SingleMenuItemProps = {
  link: string;
  closeNav: () => void;
};

export function SingleMenuItem({ link, closeNav }: SingleMenuItemProps) {
  return (
    <Menu.Item>
      {({ close }) => (
        <Link
          href={`/${link}`}
          className="block px-4 py-2 break-keep whitespace-nowrap text-right hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={() => {
            closeNav();
            close();
          }}
        >
          {link}
        </Link>
      )}
    </Menu.Item>
  );
}
