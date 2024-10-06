import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { SingleMenuItem } from "./SingleMenuItem";
import { FiChevronDown } from "react-icons/fi";

type MenuProps = {
  links: string[];
  text: string;
  closeNav: () => void;
};

export function CollapsibleMenuDesktop({ links, text, closeNav }: MenuProps) {
  return (
    <Menu as="div" className="block relative ml-3">
      <Menu.Button className="block hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-3 py-2 text-sm font-medium">
        <span className="flex items-center justify-center">
          <span>{text}</span>
          <FiChevronDown className="h-3 w-3 ml-1" />
        </span>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="overflow-hidden primary-bright dark:primary-dark flex-col absolute box-border right-0 z-50 mt-2 origin-top-right w-fit rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {links.map((item) => (
            <SingleMenuItem key={item} link={item} closeNav={closeNav} />
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export function CollapsibleMenuMobile({ links, text, closeNav }: MenuProps) {
  return (
    <Menu as="div" className="relative w-fit">
      <div className="flex flex-col">
        <Menu.Button className="self-end hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-3 py-2 text-sm font-medium flex justify-end">
          <div className="flex items-center justify-center">
            <p>{text}</p>
            <FiChevronDown className="h-3 w-3 ml-1" />
          </div>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="overflow-hidden primary-bright dark:bg-slate-800 mt-2 w-48 origin-top-right rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
            {links.map((item) => (
              <SingleMenuItem key={item} link={item} closeNav={closeNav} />
            ))}
          </Menu.Items>
        </Transition>
      </div>
    </Menu>
  );
}
