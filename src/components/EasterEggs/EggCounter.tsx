import { useEffect, useState } from "react";
import { EASTER_EGG_IDS, EASTER_EGGS_CHANGED_EVENT, getFoundEggs } from "src/lib/easterEggs";

const known = new Set<string>(EASTER_EGG_IDS);

/** "N/8 eggs found", once at least one is found. Reads storage after mount, so SSR renders nothing. */
export const EggCounter = () => {
  const [found, setFound] = useState(0);

  useEffect(() => {
    const update = () => setFound(getFoundEggs().filter((id) => known.has(id)).length);
    update();
    window.addEventListener(EASTER_EGGS_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EASTER_EGGS_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (found === 0) return null;
  return (
    <span>
      {found}/{EASTER_EGG_IDS.length} eggs found
    </span>
  );
};
