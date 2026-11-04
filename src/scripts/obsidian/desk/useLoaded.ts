import { useEffect, useState } from "react";

/** Loads with `load`, again whenever `version` changes; keeps old data on screen meanwhile. */
export function useLoaded<T>(load: () => Promise<T>, version: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the reload signal
  useEffect(() => {
    let stale = false;
    load()
      .then((value) => {
        if (stale) return;
        setData(value);
        setError(null);
      })
      .catch((failure) => {
        console.error("Desk could not load:", failure);
        if (!stale) setError(String(failure));
      });
    return () => {
      stale = true;
    };
  }, [load, version]);
  return { data, error };
}
