import { FC, useEffect, useRef } from "react";

export const StickyHeaderProgressBar: FC = () => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateProgress = () => {
      if (!progressBarRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;

      progressBarRef.current.style.setProperty(
        "--scroll-percent",
        `${scrollPercent}%`
      );
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });

    // Initial update
    updateProgress();

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="h-1 bg-gray-200 overflow-hidden">
      <div
        ref={progressBarRef}
        className="h-full bg-blue w-full transform-gpu"
        style={{
          transform: "translateX(calc(var(--scroll-percent, 0%) - 100%))",
          transition: "transform 0.1s linear",
        }}
      ></div>
    </div>
  );
};
