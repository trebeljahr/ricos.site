import useLocalStorageState, { type LocalStorageState } from "use-local-storage-state";
import { demoStorageKey } from "../lib/computer/demoStorage";

/** Saves authored text and codebooks immediately, with SSR and blocked-storage fallbacks. */
export function useDemoState(id: string, defaultValue: string): LocalStorageState<string>;
export function useDemoState<T extends string | string[]>(
  id: string,
  defaultValue: T,
  valid?: (value: T) => boolean,
): LocalStorageState<T>;
export function useDemoState<T extends string | string[]>(
  id: string,
  defaultValue: T,
  valid?: (value: T) => boolean,
) {
  const [value, setValue, storage] = useLocalStorageState<T>(demoStorageKey(id), {
    defaultValue,
    serializer: {
      stringify: JSON.stringify,
      parse: (raw) => {
        const value: unknown = JSON.parse(raw);
        const correctType =
          typeof defaultValue === "string"
            ? typeof value === "string"
            : Array.isArray(value) &&
              value.length === defaultValue.length &&
              value.every((item) => typeof item === "string");
        if (!correctType || (valid && !valid(value as T))) throw new Error("Invalid demo draft");
        return value;
      },
    },
  });
  return [value ?? defaultValue, setValue, storage] as LocalStorageState<T>;
}
