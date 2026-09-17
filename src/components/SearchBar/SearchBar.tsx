import { FiSearch } from "@components/Icons";
import { type ChangeEvent, useEffect, useState } from "react";
import { fuzzySearch } from "src/lib/fuzzySearch";
import { writeHistoryState } from "src/lib/historyState";

export type SearchProps<T extends Record<string, any>> = {
  setFiltered: (filtered: T[]) => void;
  all: T[];
  searchByTitle: string;
  searchKeys: string[];
  /** fuzzysort score cutoff (0–1). Raise it when searching long text, where low scores match nearly everything. */
  threshold?: number;
  /** Starting term, e.g. one restored with `readHistoryState(historyName, "")`. */
  initialTerm?: string;
  /** Saves the term on the history entry under this name, so going back restores it. */
  historyName?: string;
};

export default function Search<T extends Record<string, any>>({
  setFiltered,
  all,
  searchKeys,
  searchByTitle = "Search...",
  threshold = 0.1,
  initialTerm = "",
  historyName,
}: SearchProps<T>) {
  const [searchTerm, setSearchTerm] = useState(initialTerm);

  // biome-ignore lint/correctness/useExhaustiveDependencies: verify dependency list manually
  useEffect(() => {
    if (historyName) writeHistoryState(historyName, searchTerm);
    setFiltered(fuzzySearch(all, searchTerm, searchKeys, threshold));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="relative not-prose">
      <input
        type="text"
        placeholder={searchByTitle}
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100 dark:focus:ring-blue-400"
      />
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
    </div>
  );
}
