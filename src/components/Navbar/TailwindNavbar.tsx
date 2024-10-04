import { Disclosure } from "@headlessui/react";
import {
  Bars3Icon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { DarkModeHandler } from "./DarkModeHandler";
import {
  CollapsibleMenuDesktop,
  CollapsibleMenuMobile,
} from "./CollapsibleMenus";
import { useMediaQuery } from "react-responsive";

const navigation = ["posts", "newsletters", "photography"];
const resources = [
  "needlestack",
  "booknotes",
  "podcastnotes",
  "travel",
  "quotes",
];
const about = ["now", "principles", "1-month-projects"];

import dynamic from "next/dynamic";
const MediaQuery = dynamic(() => import("react-responsive"), {
  ssr: false,
});

export function TailwindNavbar() {
  return (
    <header className="not-prose z-20 bg-white dark:bg-gray-900 py-3 sticky top-0 left-0">
      <MediaQuery query={"(max-width: 1024px)"}>
        {(isMobile: boolean) => (
          <Disclosure as="nav">
            {({ open, close }) => (
              <div className="mx-auto max-w-7xl px-2 lg:px-8 flex items-center justify-between">
                <Link
                  href="/"
                  className="flex flex-shrink-0 items-center not-prose"
                >
                  <Image
                    className="h-8 w-auto"
                    src="/favicon/apple-touch-icon.png"
                    alt="trebeljahr"
                    width={32}
                    height={32}
                  />
                  <span className="ml-1 font-semibold">trebeljahr</span>
                </Link>
                {isMobile ? (
                  <MobileVersion {...{ open, close }} />
                ) : (
                  <DesktopVersion {...{ open, close }} />
                )}
              </div>
            )}
          </Disclosure>
        )}
      </MediaQuery>
    </header>
  );
}

type NavbarProps = {
  open: boolean;
  close: () => void;
};

function MobileVersion({ open, close }: NavbarProps) {
  return (
    <div>
      <div className="absolute mr-2 inset-y-0 right-0 flex items-center lg:hidden">
        <DarkModeHandler />

        <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
          <span className="sr-only">Open main menu</span>
          {open ? (
            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
          )}
        </Disclosure.Button>
      </div>
      <Disclosure.Panel className="absolute z-20 top-14 w-screen h-screen bg-white dark:bg-gray-900 right-0">
        <div className="flex flex-col px-2 pb-3 pt-2 items-end justify-end">
          {navigation.map((item) => (
            <Link
              key={item}
              href={"/" + item}
              className="block w-fit rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 "
            >
              {item}
            </Link>
          ))}

          <CollapsibleMenuMobile
            links={resources}
            text="resources"
            closeNav={close}
          />
          <CollapsibleMenuMobile links={about} text="about" closeNav={close} />
        </div>
      </Disclosure.Panel>
    </div>
  );
}

function DesktopVersion({ close }: NavbarProps) {
  return (
    <>
      <div className="flex flex-1 mr-1 items-stretch justify-end lg:mr-0 lg:items-center">
        <div className="hidden lg:ml-6 lg:block sm:justify-self-end">
          <div className="flex space-x-4">
            <DarkModeHandler />

            {navigation.map((item) => (
              <Link
                key={item}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 "
                href={"/" + item}
              >
                {item}
              </Link>
            ))}
            <CollapsibleMenuDesktop
              links={resources}
              text="resources"
              closeNav={close}
            />
            <CollapsibleMenuDesktop
              links={about}
              text="about"
              closeNav={close}
            />
          </div>
        </div>
      </div>
    </>
  );
}
