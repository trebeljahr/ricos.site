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

  const [actualWidth, setActualWidth] = useState<number>();
  const [actualHeight, setActualHeight] = useState<number>();

  useEffect(() => {
    if (!width) return;

    const maxHeight = 500;
    let newWidth = width * 0.95;
    if (width > 600) {
      newWidth = 440;
    }
    if (width > 1030) {
      newWidth = 780;
    }
    const aspectRatio = newWidth / maxHeight;

    setActualWidth(newWidth);
    setActualHeight(Math.min(maxHeight, newWidth * aspectRatio));
  }, [width]);

  return { width: actualWidth, height: actualHeight };
}
