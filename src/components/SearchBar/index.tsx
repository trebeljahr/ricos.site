// A plain re-export, not next/dynamic with `ssr: false`: the input appeared only
// after its chunk loaded, and that pushed the whole list down by 66-78 px.
export { default as Search } from "./SearchBar";
