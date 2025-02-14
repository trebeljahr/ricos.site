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
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="overflow-hidden bg-white dark:bg-gray-800 flex-col absolute box-border right-0 z-50 origin-top-right w-fit rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {links.map((item) => (
            <SingleMenuItem key={item} link={item} />
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  );
}

type MobileMenuProps = DesktopMenuProps & {
  closeNav?: () => void;
};

export function CollapsibleMenuMobile({
  links,
  text,
  closeNav,
}: MobileMenuProps) {
  return (
    <Menu as="div" className="relative w-fit">
      <div className="flex flex-col">
        <MenuButton className="self-end hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-3 py-2 flex justify-end">
          <div className="flex items-center justify-center">
            <span>{text}</span>
            <FiChevronDown className="h-3 w-3 ml-1" />
          </div>
        </MenuButton>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <MenuItems className="overflow-hidden bg-white dark:bg-slate-800 w-48 origin-top-right rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
            {links.map((item) => (
              <SingleMenuItem key={item} link={item} closeNav={closeNav} />
            ))}
          </MenuItems>
        </Transition>
      </div>
    </Menu>
  );
}
