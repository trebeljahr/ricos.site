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

export const SiteSearch = () => {
  const [open, setOpen] = useState(false);
  // Once true, keep the dialog component mounted so re-opening is instant.
  const [hasOpened, setHasOpened] = useState(false);
  const isMac = useIsMac();

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
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Search the site"
      >
        <FiSearch className="w-4 h-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
          {isMac ? "⌘" : "Ctrl+"}K
        </kbd>
      </button>

      {hasOpened && <SiteSearchDialog open={open} onClose={() => setOpen(false)} />}
    </>
  );
};
