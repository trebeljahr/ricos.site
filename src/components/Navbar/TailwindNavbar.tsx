import { FiMenu, FiX } from "@components/Icons";
import { ProgressBar } from "@components/ProgressBar";
import { SiteSearch } from "@components/SiteSearch";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollLock } from "src/hooks/useScrollLock";
import { CollapsibleMenuDesktop, CollapsibleMenuMobile } from "./CollapsibleMenus";
import { DarkModeHandler } from "./DarkModeHandler";
import { navGroups, primaryNavigation } from "./navItems";

export const RicosSiteBanner = () => {
  return (
    <Link href="/" className="flex shrink-0 items-center not-prose">
      <Image
        className="h-5 w-auto mr-1"
        src="/favicon/apple-touch-icon.png"
        alt="ricos.site logo of a chemistry beaker"
        width={32}
        height={32}
        unoptimized
      />
      <span className="ml-1 text-xl font-bold">ricos.site</span>
    </Link>
  );
};

export function TailwindNavbar({ withProgressBar = false }: { withProgressBar?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useScrollLock(open);

  // Escape closes the menu and hands focus back to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <header
      id="navbar"
      className={clsx(
        "fixed top-0 left-0 z-999 w-full not-prose pt-3 transition-colors duration-300 dark:bg-gray-900",
        open ? "bg-white" : "glassy hover:bg-white",
        !withProgressBar && "pb-2",
      )}
    >
      <nav className="mx-auto flex items-center justify-between gap-4 px-3 pb-1 xl:px-10">
        <RicosSiteBanner />
        <div className="flex items-center gap-1">
          <DesktopLinks />
          <span
            aria-hidden
            className="mx-2 hidden h-5 w-px bg-gray-300 xl:block dark:bg-gray-700"
          />
          {/* One instance for both layouts, so Cmd+K only ever opens one dialog. */}
          <SiteSearch onOpen={close} />
          <DarkModeHandler />
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((p) => !p)}
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-gray-200 xl:hidden dark:hover:bg-gray-700"
          >
            <span className="sr-only">{open ? "Close main menu" : "Open main menu"}</span>
            {open ? <FiX className="size-5" /> : <FiMenu className="size-5" />}
          </button>
        </div>
      </nav>
      {withProgressBar && <ProgressBar />}
      <MobileMenu open={open} close={close} />
    </header>
  );
}

function MobileMenu({ open, close }: { open: boolean; close: () => void }) {
  return (
    // Always rendered so the transition can play in both directions; `inert`
    // plus `invisible` keep the closed panel out of the tab order and a11y tree.
    <div
      id="mobile-menu"
      inert={!open}
      className={clsx(
        "absolute inset-x-0 top-full h-[calc(100dvh-100%)] overflow-y-auto overscroll-contain bg-white xl:hidden dark:bg-gray-900",
        "transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none",
        open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
      )}
    >
      <div className="flex flex-col px-1 pt-2 pb-8">
        {navGroups.map((group) => (
          <CollapsibleMenuMobile
            key={group.label}
            links={group.items}
            text={group.label}
            closeNav={close}
          />
        ))}
        {primaryNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className="flex items-center rounded-md px-3 py-3 text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DesktopLinks() {
  return (
    <div className="hidden items-center gap-1 xl:flex">
      {navGroups.map((group) => (
        <CollapsibleMenuDesktop key={group.label} links={group.items} text={group.label} />
      ))}
      {primaryNavigation.map((item) => (
        <Link
          key={item.href}
          className="inline-flex h-9 items-center rounded-md px-3 hover:bg-gray-200 dark:hover:bg-gray-700"
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
