import { type ReactElement, useEffect, useState } from "react";

type ScrollVisibilityOptions = {
  /** Percentage of the page that has to be behind the reader. */
  howFarDown?: number;
  /** Screens of content that have to be behind the reader; wins over howFarDown. */
  afterScreens?: number;
};

export function useScrollVisibility({ howFarDown = 50, afterScreens }: ScrollVisibilityOptions) {
  const [visible, setVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      const windowHeight = window.innerHeight;

      // A fixed number of screens keeps the trigger in the same place on a
      // 2000px page and on a 20000px one, where a percentage does not.
      const shouldBeVisible =
        afterScreens === undefined
          ? (window.scrollY / (document.documentElement.scrollHeight - windowHeight)) * 100 >
            howFarDown
          : window.scrollY > windowHeight * afterScreens;

      if (shouldBeVisible && !hasTriggered) {
        setVisible(true);
        setHasTriggered(true);
      }
    };

    window.addEventListener("scroll", toggleVisible, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisible);
  }, [howFarDown, afterScreens, hasTriggered]);

  return { visible, setVisible };
}

export function ShowAfterScrolling({
  children,
  howFarDown = 50,
  afterScreens,
}: ScrollVisibilityOptions & {
  children: ReactElement;
}) {
  const { visible } = useScrollVisibility({ howFarDown, afterScreens });
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
