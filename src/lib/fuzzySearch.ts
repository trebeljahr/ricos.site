import fuzzysort from "fuzzysort";

/** Items matching `term` on any of `keys`, best match first; all items for an empty term. */
export const fuzzySearch = <T>(all: T[], term: string, keys: string[], threshold = 0.1): T[] =>
  term.trim() === ""
    ? all
    : fuzzysort.go(term, all, { keys, threshold }).map((result) => result.obj);
