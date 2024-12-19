import { FC, useState, useEffect, useRef, useCallback } from "react";

export const StickyHeaderProgressBar: FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const animationFrame = useRef<number | null>(null);
  const lastUpdateTime = useRef(0);

  const updateScrollProgress = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime.current < 16) {
      animationFrame.current = requestAnimationFrame(updateScrollProgress);
      return;
    }

    const scrollPx = document.documentElement.scrollTop;
    const winHeightPx =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrolled = Math.min(scrollPx / winHeightPx, 1);

    setScrollProgress(scrolled * 100);
    lastUpdateTime.current = currentTime;

    animationFrame.current = requestAnimationFrame(updateScrollProgress);
  }, []);

  useEffect(() => {
    animationFrame.current = requestAnimationFrame(updateScrollProgress);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [updateScrollProgress]);

  return (
    <div className="h-1 bg-gray-200">
      <div
        className="h-1 bg-blue transition-all duration-500"
        style={{ width: `${scrollProgress}%` }}
      ></div>
    </div>
  );
};
