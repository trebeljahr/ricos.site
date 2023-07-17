import { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import Link from "next/link";

const navigation = ["posts", "newsletters", "photography"];
const resources = ["needlestack", "booknotes", "podcastnotes", "quotes"];
const aboutMe = ["principles", "now"];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function SingleMenuItem({ link }: { link: string }) {
  return (
    <Menu.Item>
      {({ active }) => (
        <Link
          href={`/${link}`}
          className={classNames(
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
    console.log(link);

    return router.asPath.startsWith("/" + link);
  };

  return (
    <Disclosure as="nav" className="bg-gray-800">
      {({ open }) => (
        <>
          <MobileVersion {...{ isActive, open }} />
          <DesktopVersion {...{ isActive, open }} />
        </>
      )}
    </Disclosure>
  );
}

type NavbarProps = {
  open: boolean;
  isActive: (link: string) => boolean;
};

function MobileVersion({ open, isActive }: NavbarProps) {
  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 relative flex h-16 items-center justify-between">
      <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
        <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
          <span className="sr-only">Open main menu</span>
          {open ? (
            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
          )}
        </Disclosure.Button>
      </div>
      <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
        <div className="flex flex-shrink-0 items-center">
          <img
            className="h-8 w-auto"
            src="/favicon/apple-touch-icon.png"
            alt="trebeljahr"
          />
          <span className="text-white">trebeljahr</span>
        </div>
        <div className="hidden sm:ml-6 sm:block">
          <div className="flex space-x-4">
            {navigation.map((item) => (
              <Link
                key={item}
                href={"/" + item}
                className={classNames(
                  isActive(item)
                    ? "bg-gray-900 text-white hover:text-white cursor-default"
                    : "text-gray-300 hover:bg-gray-700 hover:text-blue",
                  "rounded-md px-3 py-2 text-sm font-medium"
                )}
                aria-current={isActive(item) ? "page" : undefined}
              >
                {item}
              </Link>
            ))}
            <Menu as="div" className="relative ml-3">
              <button className="block text-gray-300 hover:bg-gray-700 hover:text-blue   rounded-md px-3 py-2 text-sm font-medium">
                resources
              </button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute left-0 z-10 mt-2 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {resources.map((item) => (
                    <SingleMenuItem link={item} />
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopVersion({ isActive }: NavbarProps) {
  return (
    <Disclosure.Panel className="sm:hidden">
      <div className="space-y-1 px-2 pb-3 pt-2">
        {navigation.map((item) => (
          <Link
            key={item}
            href={item}
            className={classNames(
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

        <Disclosure.Button>
          <Menu as="div" className="relative ml-3">
            <Menu.Button className="block text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-base font-medium">
              <span>resources</span>
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
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {resources.map((item) => (
                  <SingleMenuItem link={item} />
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        </Disclosure.Button>
      </div>
    </Disclosure.Panel>
  );
}
