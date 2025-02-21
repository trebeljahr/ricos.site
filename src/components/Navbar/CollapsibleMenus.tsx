import {
  Disclosure,
  Menu,
  MenuButton,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { Fragment } from "react";
import { SingleMenuItem } from "./SingleMenuItem";
import { FiChevronDown } from "react-icons/fi";
import clsx from "clsx";

type DesktopMenuProps = {
  links: string[];
  text: string;
};

export function CollapsibleMenuDesktop({ links, text }: DesktopMenuProps) {
  return (
    <Menu as="div" className="h-fit block relative ml-3">
      <MenuButton className="block hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-3 py-2">
        <span className="flex items-center justify-center">
          <span>{text}</span>
          <FiChevronDown className="h-3 w-3 ml-1" />
        </span>
      </MenuButton>

      <MenuItems className="overflow-hidden bg-white dark:bg-gray-800 flex-col absolute box-border right-0 z-50 mt-2 origin-top-right w-fit rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        {links.map((item) => (
          <SingleMenuItem key={item} link={item} />
        ))}
      </MenuItems>
    </Menu>
  );
}

type MobileMenuProps = DesktopMenuProps & {
  closeNav?: () => void;
  left?: boolean;
};

export function CollapsibleMenuMobile({
  links,
  text,
  closeNav,
  left = false,
}: MobileMenuProps) {
  return (
    <Menu as="div" className="relative w-fit">
      <div className="flex flex-col">
        <MenuButton
          className={clsx(
            "hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-3 py-2 flex",
            left ? "self-start justify-start" : "self-end justify-end"
          )}
        >
          <div className="flex items-center justify-center">
            <span>{text}</span>
            <FiChevronDown className="h-3 w-3 ml-1" />
          </div>
        </MenuButton>

        <MenuItems className="overflow-hidden bg-white dark:bg-slate-800 mt-2 w-48 origin-top-right rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
          {links.map((item) => (
            <SingleMenuItem
              key={item}
              link={item}
              closeNav={closeNav}
              left={left}
            />
          ))}
        </MenuItems>
      </div>
    </Menu>
  );
}
