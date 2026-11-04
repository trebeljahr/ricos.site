import { useEffect, useState } from "react";
import {
  type CharacterFile,
  loadArissa,
  loadTrex,
  type RiggedModel,
} from "src/lib/computer/graphics/skeleton";

/** The T. rex, once its numbers have arrived. */
export function useTrex(): RiggedModel | null {
  const [model, setModel] = useState<RiggedModel | null>(null);
  useEffect(() => {
    let current = true;
    void loadTrex().then((loaded) => {
      if (current) setModel(loaded);
    });
    return () => {
      current = false;
    };
  }, []);
  return model;
}

/** A character with a real UV layout, once asked for. */
export function useArissa(wanted: boolean): CharacterFile | null {
  const [model, setModel] = useState<CharacterFile | null>(null);
  useEffect(() => {
    if (!wanted) return;
    let current = true;
    void loadArissa().then((loaded) => {
      if (current) setModel(loaded);
    });
    return () => {
      current = false;
    };
  }, [wanted]);
  return model;
}
