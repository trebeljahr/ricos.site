import { FiChevronDown } from "@components/Icons";
import clsx from "clsx";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { NavItem } from "./navItems";
import { SingleMenuItem } from "./SingleMenuItem";

type DesktopMenuProps = {
  links: NavItem[];
  text: string;
};

// Custom click-outside dropdown — replaces Headless UI's <Menu> so the navbar
// doesn't drag the headlessui chunk onto every page.
function useOutsideClose(open: boolean, onClose: (opts?: { restoreFocus: boolean }) => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose({ restoreFocus: true });
    };
    // Tabbing past the last link closes the dropdown instead of leaving it open.
    const onFocusIn = (e: FocusEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, onClose]);

  return ref;
}

export function CollapsibleMenuDesktop({ links, text }: DesktopMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback((opts?: { restoreFocus: boolean }) => {
    setOpen(false);
    if (opts?.restoreFocus) buttonRef.current?.focus();
  }, []);
  const ref = useOutsideClose(open, close);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((p) => !p)}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <span>{text}</span>
        <FiChevronDown
          className={clsx(
            "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {/*
        Rendered (hidden) rather than mounted on open, so the links stay in the
        server-rendered HTML. Crawlers don't click dropdowns — pages that are
        only reachable from this menu were showing up as orphans otherwise.
        `inert` + `invisible` keep the closed panel out of the tab order.
      */}
      <div
        id={panelId}
        inert={!open}
        className={clsx(
          "absolute left-0 z-50 mt-2 flex min-w-44 origin-top-left flex-col rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10",
          "transition-[opacity,scale,visibility] duration-150 ease-out motion-reduce:transition-none",
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0",
        )}
      >
        {links.map((item) => (
          <SingleMenuItem key={item.href} link={item} onSelect={() => close()} />
        ))}
      </div>
    </div>
  );
}

type MobileMenuProps = DesktopMenuProps & {
  closeNav?: () => void;
};

export function CollapsibleMenuMobile({ links, text, closeNav }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const handleSelect = () => {
    setOpen(false);
    closeNav?.();
  };

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between rounded-md px-3 py-3 text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span>{text}</span>
        <FiChevronDown
          className={clsx(
            "size-4 text-gray-500 transition-transform duration-200 motion-reduce:transition-none dark:text-gray-400",
            open && "rotate-180",
          )}
        />
      </button>
      {/* grid-template-rows 0fr → 1fr animates to the content's natural height. */}
      <div
        id={panelId}
        inert={!open}
        className={clsx(
          "grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out motion-reduce:transition-none",
          open ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mb-2 ml-3 flex flex-col border-l border-gray-200 pl-2 dark:border-gray-700">
            {links.map((item) => (
              <SingleMenuItem key={item.href} link={item} onSelect={handleSelect} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
