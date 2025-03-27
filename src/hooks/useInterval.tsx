import { useEffect, useRef } from "react";

export const useInterval = (fn: () => void, interval: number) => {
  useEffect(() => {
    const id = setInterval(() => fn(), interval);

    return () => clearInterval(id);
  }, [fn, interval]);
};
