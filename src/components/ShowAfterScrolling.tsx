import { ReactElement, useEffect, useState } from "react";
export function useScrollVisibility({
  hideAgain,
  howFarDown,
}: {
  hideAgain: boolean;
  howFarDown: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      const scrolled = document.documentElement.scrollTop;
      const isVisible = scrolled > window.innerHeight * howFarDown;
      if (!isVisible && hideAgain) setVisible(isVisible);
      else if (isVisible) setVisible(isVisible);
    };

    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, [hideAgain, howFarDown]);

  return { visible, setVisible };
}

export function ShowAfterScrolling({
  children,
  howFarDown = 2,
  hideAgain = false,
}: {
  hideAgain?: boolean;
  howFarDown?: number;
  children: ReactElement;
}) {
  const { visible } = useScrollVisibility({ howFarDown, hideAgain });
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
