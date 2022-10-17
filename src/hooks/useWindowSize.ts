import { useState, useEffect } from "react";
export interface Size {
  width: number | undefined;
  height: number | undefined;
}

export function useWindowSize(): Size {
  const [windowSize, setWindowSize] = useState<Size>({
    width: undefined,
    height: undefined,
  });
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export function useActualSize(): Size {
  const { width } = useWindowSize();
  const maxWidth = 780;
  const maxHeight = 500;
  const [actualWidth, setActualWidth] = useState<number>();
  const [actualHeight, setActualHeight] = useState<number>();

  useEffect(() => {
    const aspectRatio = maxWidth / maxHeight;
    const newWidth = Math.min(maxWidth, (width || Infinity) * 0.95);

    setActualWidth(newWidth);
    setActualHeight(Math.min(maxHeight, newWidth * aspectRatio));
  }, [width]);

  return { width: actualWidth, height: actualHeight };
}
