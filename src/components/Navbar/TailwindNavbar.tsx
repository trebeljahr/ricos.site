import { FiMenu, FiX } from "@components/Icons";
import { ProgressBar } from "@components/ProgressBar";
import { SiteSearch } from "@components/SiteSearch";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useScrollLock } from "src/hooks/useScrollLock";
import { CollapsibleMenuDesktop, CollapsibleMenuMobile } from "./CollapsibleMenus";
import { DarkModeHandler } from "./DarkModeHandler";

const navigation = ["posts", "newsletters", "photography"];
const resources = ["quotes", "booknotes", "needlestack", "podcastnotes", "r3f"];
const about = ["now", "travel", "principles", "1-month-projects", "support", "imprint", "privacy"];

export const RicosSiteBanner = () => {
  return (
    <Link href="/" className="flex shrink-0 items-center not-prose">
      <Image
        className="h-5 w-auto mr-1"
        src="/favicon/apple-touch-icon.png"
        alt="ricos.site logo of a chemistry beaker"
        width={32}
        height={32}
      />
      <span className="ml-1 text-xl font-bold">ricos.site</span>
    </Link>
  );
};

export function TailwindNavbar({ withProgressBar = false }: { withProgressBar?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header
      id="navbar"
      className={`fixed top-0 w-screen not-prose left-0 z-999 ${
        open ? "bg-white" : "glassy hover:bg-white dark:bg-gray-900"
      } w-full dark:bg-gray-900 pt-3 transition-colors duration-300 ${
        withProgressBar ? "" : "pb-2"
      }`}
    >
      <nav className="mx-auto px-3 xl:px-10 pb-1 flex items-center justify-between">
        <RicosSiteBanner />
        <div className="flex xl:hidden items-center gap-1">
          <SiteSearch />
          <DarkModeHandler />
          <MobileVersion open={open} setOpen={setOpen} close={close} />
        </div>

        <div className="hidden xl:flex items-center gap-2">
          <DesktopVersion />
          <SiteSearch />
          <DarkModeHandler />
        </div>
      </nav>
      {withProgressBar && <ProgressBar />}
    </header>
  );
}

type MobileVersionProps = {
  open: boolean;
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  close: () => void;
};

function MobileVersion({ open, setOpen, close }: MobileVersionProps) {
  useScrollLock(open);

  // Close on Escape; close on route hash change so navigation also dismisses.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((p) => !p)}
          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="sr-only">Open main menu</span>
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>
      {open && (
        <div
          id="mobile-menu"
          className="absolute z-50 top-12 p-2 w-screen h-screen right-0 bg-white dark:bg-gray-900"
        >
          <div className="flex flex-col px-2 pb-3 pt-2 items-end justify-end">
            {navigation.map((item) => (
              <Link
                key={item}
                href={"/" + item}
                onClick={close}
                className="block w-fit rounded-md px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 "
              >
                {item}
              </Link>
            ))}

            <CollapsibleMenuMobile links={resources} text="resources" closeNav={close} />
            <CollapsibleMenuMobile links={about} text="about" closeNav={close} />
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopVersion() {
  return (
    <div className="h-fit w-full flex flex-1 mr-0 items-center">
      <div className="ml-6 block justify-self-end">
        <div className="flex space-x-4">
          {navigation.map((item) => (
            <Link
              key={item}
              className="rounded-md px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 "
              href={"/" + item}
            >
              {item}
            </Link>
          ))}
          <CollapsibleMenuDesktop links={resources} text="resources" />
          <CollapsibleMenuDesktop links={about} text="about" />
        </div>
      </div>
    </div>
  );
}
