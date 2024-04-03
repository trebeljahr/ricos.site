import { Disclosure, Menu, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment } from "react";

const navigation = ["posts", "newsletters", "photography"];
const resources = [
  "needlestack",
  "booknotes",
  "podcastnotes",
  "travel",
  "quotes",
];
const about = ["now", "principles", "1-month-projects"];

function combine(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

type SingleMenuItemProps = {
  link: string;
  closeNav: () => void;
};

function SingleMenuItem({ link, closeNav }: SingleMenuItemProps) {
  return (
    <Menu.Item>
      {({ active, close }) => (
        <Link
          href={`/${link}`}
          className={combine(
            active ? "bg-gray-100" : "",
            "block px-4 py-2 text-gray-700 self-end break-keep text-right whitespace-nowrap	"
          )}
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

export function TailwindNavbar() {
  const router = useRouter();

  const isActive = (link: string) => {
    return router.asPath.startsWith("/" + link);
  };

  return (
    <Disclosure as="nav" className="bg-gray-800">
      {({ open, close }) => (
        <>
          <DesktopVersion {...{ isActive, open, close }} />
          <MobileVersion {...{ isActive, open, close }} />
        </>
      )}
    </Disclosure>
  );
}

type NavbarProps = {
  open: boolean;
  close: () => void;
  isActive: (link: string) => boolean;
};

function DesktopVersion({ open, isActive, close }: NavbarProps) {
  return (
    <div className="mx-auto max-w-7xl px-2 md :px-6 lg:px-8 relative flex h-16 items-center justify-between">
      <div className="absolute mr-2 inset-y-0 right-0 flex items-center lg:hidden">
        <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
          <span className="sr-only">Open main menu</span>
          {open ? (
            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
          )}
        </Disclosure.Button>
      </div>
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
      <div className="flex flex-1 mr-1 items-stretch justify-end lg:mr-0 lg:items-center">
        <div className="hidden lg:ml-6 lg:block sm:justify-self-end">
          <div className="flex space-x-4">
            {navigation.map((item) => (
              <Link
                key={item}
                href={"/" + item}
                className={combine(
                  isActive(item)
                    ? "bg-gray-900 text-white hover:text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white",
                  "rounded-md px-3 py-2 text-sm font-medium"
                )}
                aria-current={isActive(item) ? "page" : undefined}
              >
                {item}
              </Link>
            ))}
            <DesktopMenu links={resources} text="resources" closeNav={close} />
            <DesktopMenu links={about} text="about" closeNav={close} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileVersion({ isActive, close }: NavbarProps) {
  return (
    <Disclosure.Panel className="lg:hidden">
      <div className="space-y-1 flex flex-col px-2 pb-3 pt-2 items-end justify-end">
        {navigation.map((item) => (
          <Link
            key={item}
            href={"/" + item}
            className={combine(
              isActive(item)
                ? "bg-gray-900 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              "block w-fit rounded-md px-3 py-2 text-sm font-medium text-right"
            )}
            aria-current={isActive(item) ? "page" : undefined}
          >
            {item}
          </Link>
        ))}

        <MobileMenu links={resources} text="resources" closeNav={close} />
        <MobileMenu links={about} text="about" closeNav={close} />
      </div>
    </Disclosure.Panel>
  );
}

type MenuProps = {
  links: string[];
  text: string;
  closeNav: () => void;
};

function DesktopMenu({ links, text, closeNav }: MenuProps) {
  const router = useRouter();
  const isActive = links.some((link) => router.asPath.startsWith("/" + link));
  return (
    <Menu as="div" className="block relative ml-3">
      <Menu.Button
        className={combine(
          isActive
            ? "bg-gray-900 text-white"
            : "text-gray-300 hover:bg-gray-700 hover:text-white",
          "block rounded-md px-3 py-2 text-sm font-medium"
        )}
      >
        <span className="flex items-center justify-center">
          <span>{text}</span>
          <ChevronDownIcon className="h-3 w-3 text-blue-500 ml-1" />
        </span>
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
        <Menu.Items className="flex-col absolute box-border right-0 z-50 mt-2 origin-top-right w-fit rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {links.map((item) => (
            <SingleMenuItem key={item} link={item} closeNav={closeNav} />
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

function MobileMenu({ links, text, closeNav }: MenuProps) {
  const router = useRouter();
  const isActive = links.some((link) => router.asPath.startsWith("/" + link));

  return (
    <Menu as="div" className="relative w-fit">
      <Disclosure.Button as="div">
        <Menu.Button
          className={combine(
            isActive
              ? "bg-gray-900 text-white"
              : "text-gray-300 hover:bg-gray-700 hover:text-white",
            "rounded-md px-3 py-2 text-sm font-medium text-right flex justify-end"
          )}
        >
          <span className="flex items-center justify-center">
            <span>{text}</span>
            <ChevronDownIcon className="h-3 w-3 text-blue-500 ml-1" />
          </span>
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
          <Menu.Items className="absolute right-0 top-10 z-50 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
            {links.map((item) => (
              <SingleMenuItem key={item} link={item} closeNav={closeNav} />
            ))}
          </Menu.Items>
        </Transition>
      </Disclosure.Button>
    </Menu>
  );
}
