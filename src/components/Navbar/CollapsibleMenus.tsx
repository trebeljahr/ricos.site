import { FiChevronDown } from "@components/Icons";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { NavItem } from "./navItems";
import { SingleMenuItem } from "./SingleMenuItem";

type DesktopMenuProps = {
  links: NavItem[];
  text: string;
};

// Custom click-outside dropdown — replaces Headless UI's <Menu> so the navbar
// doesn't drag the headlessui chunk onto every page.
function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return ref;
}

export function CollapsibleMenuDesktop({ links, text }: DesktopMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="h-fit block relative ml-3">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((p) => !p)}
        className="block hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-3 py-2"
      >
        <span className="flex items-center justify-center">
          <span>{text}</span>
          <FiChevronDown className="h-3 w-3 ml-1" />
        </span>
      </button>
      {/*
        Rendered (hidden) rather than mounted on open, so the links stay in the
        server-rendered HTML. Crawlers don't click dropdowns — pages that are
        only reachable from this menu were showing up as orphans otherwise.
      */}
      <div
        role="menu"
        className={clsx(
          "overflow-hidden bg-white dark:bg-gray-800 flex-col absolute box-border right-0 z-50 mt-2 origin-top-right w-fit rounded-md shadow-lg ring-1 ring-black ring-opacity-5",
          !open && "hidden",
        )}
      >
        {links.map((item) => (
          <SingleMenuItem key={item.href} link={item} onSelect={close} />
        ))}
      </div>
    </div>
  );
}

type MobileMenuProps = DesktopMenuProps & {
  closeNav?: () => void;
  left?: boolean;
};

export function CollapsibleMenuMobile({ links, text, closeNav, left = false }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const handleSelect = () => {
    close();
    closeNav?.();
  };

  return (
    <div className="relative w-fit">
      <div className="flex flex-col">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((p) => !p)}
          className={clsx(
            "hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md px-3 py-2 flex",
            left ? "self-start justify-start" : "self-end justify-end",
          )}
        >
          <div className="flex items-center justify-center">
            <span>{text}</span>
            <FiChevronDown className="h-3 w-3 ml-1" />
          </div>
        </button>
        {open && (
          <div
            role="menu"
            className="overflow-hidden bg-white dark:bg-slate-800 mt-2 w-48 origin-top-right rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
          >
            {links.map((item) => (
              <SingleMenuItem key={item.href} link={item} onSelect={handleSelect} left={left} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
