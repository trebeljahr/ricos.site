import { ReactElement, useEffect, useState } from "react";

export function useScrollVisibility({ percentage }: { percentage: number }) {
  const [visible, setVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      if (percentage > 100 || percentage < 0) {
        throw new Error("percentage must be a percentage between 0 and 100");
      }
      const scrolled = document.documentElement.scrollTop;

      const totalHeight = document.documentElement.scrollHeight;
      const threshold = totalHeight * (percentage / 100);
      console.log(totalHeight, threshold, scrolled);

      const shouldBeVisible = scrolled > threshold;

      if (shouldBeVisible && !hasTriggered) {
        setVisible(true);
        setHasTriggered(true);
      }
    };

    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, [percentage, hasTriggered]);

  return { visible, setVisible };
}

export function ShowAfterScrolling({
  children,
  percentage = 50,
}: {
  percentage?: number;
  children: ReactElement;
}) {
  const { visible } = useScrollVisibility({ percentage });
  return (
    <div
      style={{
        visibility: visible ? "visible" : "hidden",
        transition: "visibility 0.3s linear,opacity 0.3s linear",
        opacity: visible ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}
