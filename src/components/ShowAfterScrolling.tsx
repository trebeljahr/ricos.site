import { ReactElement, useEffect, useState } from "react";

export function ShowAfterScrolling({ children }: { children: ReactElement }) {
  const [visible, setVisible] = useState(false);

  const toggleVisible = () => {
    const scrolled = document.documentElement.scrollTop;
    const visibleWhenScrolled = scrolled > window.innerHeight * 1.6;
    setVisible(visibleWhenScrolled);
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);
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
