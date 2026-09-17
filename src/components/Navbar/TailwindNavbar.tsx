import { onLogoClick } from "@components/EasterEggs/Flask/logoClicks";
import { FiMenu, FiX } from "@components/Icons";
import { ProgressBar } from "@components/ProgressBar";
import { SiteSearch } from "@components/SiteSearch";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useScrollLock } from "src/hooks/useScrollLock";
import { CollapsibleMenuDesktop, CollapsibleMenuMobile } from "./CollapsibleMenus";
import { DarkModeHandler } from "./DarkModeHandler";
import { navGroups } from "./navItems";

type BannerProps = {
  iconOnly?: boolean;
  /** Hide the wordmark on phones, e.g. to make room for a breadcrumb. */
  compact?: boolean;
};

export const RicosSiteBanner = ({ iconOnly = false, compact = false }: BannerProps) => {
  return (
    <Link
      href="/"
      onClick={(event) => onLogoClick(event.currentTarget.querySelector("img"))}
      className="flex shrink-0 items-center not-prose"
      aria-label={iconOnly ? "ricos.site home" : undefined}
    >
      <Image
        className="h-5 w-auto mr-1"
        src="/favicon/apple-touch-icon.png"
        alt={iconOnly ? "" : "ricos.site logo of a chemistry beaker"}
        width={32}
        height={32}
        unoptimized
      />
      {!iconOnly && (
        <span className={clsx("ml-1 text-xl font-bold", compact && "hidden sm:inline")}>
          ricos.site
        </span>
      )}
    </Link>
  );
};

/** Open state of the mobile menu, shared by the regular and the immersive navbar. */
export function useSiteMenu() {
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

  return { open, setOpen, close, toggleRef };
}

export type SiteMenu = ReturnType<typeof useSiteMenu>;

type TailwindNavbarProps = {
  withProgressBar?: boolean;
  /** Section-specific nav shown next to the logo, e.g. the 3D playground breadcrumb. */
  secondary?: ReactNode;
};

export function TailwindNavbar({ withProgressBar = false, secondary }: TailwindNavbarProps = {}) {
  const menu = useSiteMenu();

  return (
    <header
      id="navbar"
      className={clsx(
        "sticky top-0 z-999 w-full not-prose pt-3 transition-colors duration-300 dark:bg-gray-900",
        menu.open ? "bg-white" : "glassy hover:bg-white",
        !withProgressBar && "pb-2",
      )}
    >
      <nav className="mx-auto flex items-center justify-between gap-4 px-3 pb-1 xl:px-10">
        <div className="flex min-w-0 items-center gap-1 xl:shrink-0">
          <RicosSiteBanner compact={Boolean(secondary)} />
          {secondary}
        </div>
        <SiteNavControls menu={menu} />
      </nav>
      {withProgressBar && <ProgressBar />}
      <MobileMenu open={menu.open} close={menu.close} />
    </header>
  );
}

/**
 * Menus, search, theme toggle and the mobile menu toggle. Shared by the
 * regular navbar and the immersive one on fullscreen canvas pages, so both
 * offer the same items.
 */
export function SiteNavControls({ menu }: { menu: SiteMenu }) {
  const { open, setOpen, close, toggleRef } = menu;

  return (
    <div className="flex items-center gap-1">
      <DesktopLinks />
      <span aria-hidden className="mx-2 hidden h-5 w-px bg-gray-300 xl:block dark:bg-gray-700" />
      {/* One instance for both layouts, so Cmd+K only ever opens one dialog. */}
      <SiteSearch onOpen={close} />
      <DarkModeHandler />
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex size-9 items-center justify-center rounded-md transition-colors duration-300 ease-out hover:bg-accent/10 hover:text-accent motion-reduce:transition-none xl:hidden"
      >
        <span className="sr-only">{open ? "Close main menu" : "Open main menu"}</span>
        {open ? <FiX className="size-5" /> : <FiMenu className="size-5" />}
      </button>
    </div>
  );
}

export function MobileMenu({ open, close }: { open: boolean; close: () => void }) {
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
    </div>
  );
}
