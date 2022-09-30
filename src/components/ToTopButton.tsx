import { useState, useEffect } from "react";

export function ToTopButton() {
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
    <button
      id="to-top-button"
      onClick={() => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }}
      style={{
        display: visible ? "inline" : "none",
      }}
    >
      <span className="icon-arrow-up"></span>
    </button>
  );
}
