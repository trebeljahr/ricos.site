import { FC, useEffect, useRef } from "react";

export const ProgressBar: FC = () => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateProgress = () => {
      if (!progressBarRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollPercent =
        (window.scrollY / (documentHeight - windowHeight)) * 100;

      progressBarRef.current.style.setProperty(
        "--scroll-percent",
        `${isNaN(scrollPercent) ? 0 : scrollPercent}%`
      );
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });

    updateProgress();

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="h-1 dark:bg-gray-900 overflow-hidden">
      <div
        ref={progressBarRef}
        className="h-full bg-myBlue w-full transform-gpu"
        style={{
          transform: "translateX(calc(var(--scroll-percent, 0%) - 100%))",
          transition: "transform 0.1s linear",
        }}
      ></div>
    </div>
  );
};
