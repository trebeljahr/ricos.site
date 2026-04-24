import { FiSearch } from "@components/Icons";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import Fuse from "fuse.js";
import { useRouter } from "next/router";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

type SearchItem = {
  title: string;
  description: string;
  link: string;
  type: string;
  tags: string;
};

const typeColors: Record<string, string> = {
  Post: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Newsletter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Book Notes": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Travel: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Podcast: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  Page: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

let fuseInstance: Fuse<SearchItem> | null = null;
let searchItems: SearchItem[] = [];

async function getFuse(): Promise<Fuse<SearchItem>> {
  if (fuseInstance) return fuseInstance;

  const res = await fetch("/search-index.json");
  searchItems = await res.json();

  fuseInstance = new Fuse(searchItems, {
    keys: [
      { name: "title", weight: 0.4 },
      { name: "description", weight: 0.3 },
      { name: "tags", weight: 0.2 },
      { name: "type", weight: 0.1 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
  });

  return fuseInstance;
}

const useIsMac = () => {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);
  return isMac;
};

export const SiteSearch = () => {
  const [open, setOpen] = useState(false);
  const isMac = useIsMac();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      // Preload the index
      getFuse();
    }
  }, [open]);

  const handleSearch = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setSelectedIndex(0);

    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    const fuse = await getFuse();
    const fuseResults = fuse.search(q, { limit: 10 });
    setResults(fuseResults.map((r) => r.item));
  }, []);

  const navigate = useCallback(
    (link: string) => {
      setOpen(false);
      router.push(link);
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].link);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Search the site"
      >
        <FiSearch className="w-4 h-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
          {isMac ? "⌘" : "Ctrl+"}K
        </kbd>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
        data-site-search=""
      >
        <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

        <div className="fixed inset-0 flex items-start justify-center pt-4 sm:pt-[20vh]">
          <DialogPanel className="not-prose w-full max-w-lg mx-2 sm:mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
              <FiSearch className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search posts, books, newsletters, travel..."
                value={query}
                onChange={handleSearch}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              >
                ESC
              </button>
            </div>

            {results.length > 0 && (
              <div className="max-h-80 overflow-y-auto py-2" role="listbox">
                {results.map((item, i) => (
                  <div key={item.link} role="option" aria-selected={i === selectedIndex}>
                    <button
                      onClick={() => navigate(item.link)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${
                        i === selectedIndex ? "bg-gray-100 dark:bg-gray-800" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                            typeColors[item.type] || typeColors.Page
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                      {item.description && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {item.description}
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {query.length < 2 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                Start typing to search across all content
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};
