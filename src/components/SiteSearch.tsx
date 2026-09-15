import { FiSearch } from "@components/Icons";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Heavy chunk (Headless UI Dialog + fuse.js) only loaded the first time
// the user actually opens the search.
const SiteSearchDialog = dynamic(() => import("./SiteSearchDialog"), { ssr: false });

const useIsMac = () => {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);
  return isMac;
};

type SiteSearchProps = {
  /** Called whenever the dialog opens (click or Cmd+K), e.g. to close a mobile menu. */
  onOpen?: () => void;
};

export const SiteSearch = ({ onOpen }: SiteSearchProps = {}) => {
  const [open, setOpen] = useState(false);
  // Once true, keep the dialog component mounted so re-opening is instant.
  const [hasOpened, setHasOpened] = useState(false);
  const isMac = useIsMac();

  useEffect(() => {
    if (open) onOpen?.();
  }, [open, onOpen]);

  const openSearch = () => {
    setOpen(true);
    setHasOpened(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setHasOpened(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="inline-flex size-9 items-center justify-center gap-2 rounded-md text-sm transition-colors hover:bg-gray-200 sm:mr-1 sm:w-auto sm:justify-start sm:border sm:border-gray-200 sm:bg-gray-50 sm:pr-1.5 sm:pl-3 sm:text-gray-500 dark:hover:bg-gray-700 sm:dark:border-gray-700 sm:dark:bg-gray-800 sm:dark:text-gray-400"
        aria-label="Search the site"
      >
        <FiSearch className="size-4 shrink-0" />
        <span className="hidden pr-4 sm:inline">Search</span>
        <kbd className="hidden h-6 items-center rounded border border-gray-200 bg-white px-1.5 font-sans text-xs text-gray-500 sm:inline-flex dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
          {isMac ? "⌘" : "Ctrl+"}K
        </kbd>
      </button>

      {hasOpened && <SiteSearchDialog open={open} onClose={() => setOpen(false)} />}
    </>
  );
};
