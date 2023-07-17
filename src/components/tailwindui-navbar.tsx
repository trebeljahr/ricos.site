import { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";

const navigation = ["posts", "newsletters", "photography"];
const resources = ["needlestack", "booknotes", "podcastnotes", "quotes"];
const about = ["principles", "now"];

function combine(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function SingleMenuItem({ link }: { link: string }) {
  return (
    <Menu.Item>
      {({ active }) => (
        <Link
          href={`/${link}`}
          className={combine(
            active ? "bg-gray-100" : "",
            "block px-4 py-2 link-sm text-gray-700"
          )}
        >
          {link}
        </Link>
      )}
    </Menu.Item>
  );
}

export function TailwindNavbar() {
  const router = useRouter();

  const isActive = (link: string) => {
    return router.asPath.startsWith("/" + link);
  };

  return (
    <Disclosure as="nav" className="bg-gray-800">
      {({ open }) => (
        <>
          <DesktopVersion {...{ isActive, open }} />
          <MobileVersion {...{ isActive, open }} />
        </>
      )}
    </Disclosure>
  );
}

type NavbarProps = {
  open: boolean;
  isActive: (link: string) => boolean;
};

function DesktopVersion({ open, isActive }: NavbarProps) {
  return (
    <div className="mx-auto max-w-7xl px-2 md :px-6 lg:px-8 relative flex h-16 items-center justify-between">
      <div className="absolute inset-y-0 left-0 flex items-center lg:hidden">
        <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
          <span className="sr-only">Open main menu</span>
          {open ? (
            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
          )}
        </Disclosure.Button>
      </div>
      <div className="flex flex-1 items-stretch justify-end lg:items-center lg:justify-between ">
        <Link href="/" className="flex flex-shrink-0 items-center">
          <Image
            className="h-8 w-auto"
            src="/favicon/apple-touch-icon.png"
            alt="trebeljahr"
            width={32}
            height={32}
          />
          <span className="text-white ml-1">trebeljahr</span>
        </Link>
        <div className="hidden lg:ml-6 lg:block">
          <div className="flex space-x-4">
            {navigation.map((item) => (
              <Link
                key={item}
                href={"/" + item}
                className={combine(
                  isActive(item)
                    ? "bg-gray-900 text-white hover:text-white cursor-default"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white",
                  "rounded-md px-3 py-2 text-sm font-medium"
                )}
                aria-current={isActive(item) ? "page" : undefined}
              >
                {item}
              </Link>
            ))}
            <DesktopMenu links={resources} text="resources" />
            <DesktopMenu links={about} text="about" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileVersion({ isActive }: NavbarProps) {
  return (
    <Disclosure.Panel className="lg:hidden">
      <div className="space-y-1 px-2 pb-3 pt-2">
        {navigation.map((item) => (
          <Link
            key={item}
            href={item}
            className={combine(
              isActive(item)
                ? "bg-gray-900 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              "block rounded-md px-3 py-2 text-base font-medium"
            )}
            aria-current={isActive(item) ? "page" : undefined}
          >
            {item}
          </Link>
        ))}

        <MobileMenu links={resources} text="resources" />
        <MobileMenu links={about} text="about" />
      </div>
    </Disclosure.Panel>
  );
}

type MenuProps = {
  links: string[];
  text: string;
};

function DesktopMenu({ links, text }: MenuProps) {
  return (
    <Menu as="div" className="block relative ml-3">
      <Menu.Button className="block text-gray-300 hover:bg-gray-700 hover:text-white   rounded-md px-3 py-2 text-sm font-medium">
        {text}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {links.map((item) => (
            <SingleMenuItem key={item} link={item} />
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

function MobileMenu({ links, text }: MenuProps) {
  return (
    <Menu as="div" className="relative ml-3">
      <Disclosure.Button as="div">
        <Menu.Button className="block text-gray-300 hover:bg-gray-700 hover:text-white rounded-md py-2 text-base font-medium">
          {text}
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute left-0 z-20 mt-2 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {links.map((item) => (
              <SingleMenuItem key={item} link={item} />
            ))}
          </Menu.Items>
        </Transition>
      </Disclosure.Button>
    </Menu>
  );
}
