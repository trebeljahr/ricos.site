import { Menu, MenuItem } from "@headlessui/react";
import clsx from "clsx";
import Link from "next/link";

type SingleMenuItemProps = {
  link: string;
  closeNav?: () => void;
  left?: boolean;
};

// Override the display label for specific URL slugs so navigation text can
// differ from the URL itself (e.g. show "legal notice" but link to /impressum).
const LINK_LABELS: Record<string, string> = {
  imprint: "legal notice",
};

export function SingleMenuItem({ link, closeNav, left }: SingleMenuItemProps) {
  const label = LINK_LABELS[link] ?? link;
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
          {label}
        </Link>
      )}
    </MenuItem>
  );
}
