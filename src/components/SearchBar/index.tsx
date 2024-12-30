import dynamic from "next/dynamic";
import { SearchProps } from "./SearchBar";

export const Search = dynamic(import("./SearchBar"), { ssr: false }) as <
  T extends Record<string, any>
>(
  props: SearchProps<T>
) => JSX.Element;
