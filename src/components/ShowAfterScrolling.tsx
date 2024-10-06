import { ReactElement, useEffect, useState } from "react";

export function useScrollVisibility({ howFarDown }: { howFarDown: number }) {
  const [visible, setVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      const scrolled = document.documentElement.scrollTop;
      const shouldBeVisible = scrolled > window.innerHeight * howFarDown;

      if (shouldBeVisible && !hasTriggered) {
        setVisible(true);
        setHasTriggered(true);
      }
    };

    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, [howFarDown, hasTriggered]);

  return { visible, setVisible };
}

export function ShowAfterScrolling({
  children,
  howFarDown = 2,
}: {
  howFarDown?: number;
  children: ReactElement;
}) {
  const { visible } = useScrollVisibility({ howFarDown });
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
