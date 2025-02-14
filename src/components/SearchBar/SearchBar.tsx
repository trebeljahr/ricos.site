import fuzzysort from "fuzzysort";
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { FiSearch } from "react-icons/fi";

export type SearchProps<T extends Record<string, any>> = {
  setFiltered: Dispatch<SetStateAction<T[]>>;
  all: T[];
  searchByTitle: string;
  searchKeys: string[];
};

export default function Search<T extends Record<string, any>>({
  setFiltered,
  all,
  searchKeys,
  searchByTitle = "Search...",
}: SearchProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFiltered(all);
      return;
    }

    const results = fuzzysort.go(searchTerm, all, {
      keys: searchKeys,
      threshold: 0.1,
    });

    setFiltered(results.map((result) => result.obj));
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
