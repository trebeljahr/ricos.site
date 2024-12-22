import { useWindowSize } from "@react-hook/window-size";
import { useState, useEffect } from "react";

export function useActualSize() {
  const [width] = useWindowSize();
  const [actualWidth, setActualWidth] = useState<number>();
  const [actualHeight, setActualHeight] = useState<number>();

  useEffect(() => {
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
