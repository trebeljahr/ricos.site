import { FiMenu, FiX } from "@components/Icons";
import clsx from "clsx";
import { useState } from "react";
import { CollapsibleMenuMobile } from "./CollapsibleMenus";
import { DarkModeHandler } from "./DarkModeHandler";
import { navGroups } from "./navItems";
import { RicosSiteBanner } from "./TailwindNavbar";

export const LeftSmallNavbar = () => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  return (
    <div className="prose-a:no-underline prose-a:hover:text-inherit prose-a:font-normal font-normal prose-a:text-inherit">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="left-small-menu"
        className={clsx(
          "fixed top-2 z-50 flex items-center justify-center rounded-full bg-white p-3 transition-[left,background-color,color] duration-300 ease-out hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] hover:text-accent motion-reduce:transition-none dark:bg-gray-900 dark:hover:bg-[color-mix(in_srgb,var(--color-accent)_15%,var(--color-gray-900))]",
          open ? "left-[175px]" : "left-2",
        )}
        onClick={toggle}
      >
        <span className="sr-only">{open ? "Close main menu" : "Open main menu"}</span>
        {open ? <FiX className="size-4" /> : <FiMenu className="size-4" />}
      </button>
      <div
        id="left-small-menu"
        inert={!open}
        className={clsx(
          "absolute top-0 left-0 z-40 h-screen w-[220px] bg-white py-2 dark:bg-gray-900",
          "transition-[translate,visibility] duration-300 ease-out motion-reduce:transition-none",
          open ? "visible translate-x-0" : "invisible -translate-x-full",
        )}
      >
        <div className="absolute right-2 bottom-2">
          <DarkModeHandler />
        </div>

        <div className="flex flex-col px-3 pt-2 pb-3">
          <RicosSiteBanner />
          <div className="flex flex-col pt-3">
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
      </div>
    </div>
  );
};
