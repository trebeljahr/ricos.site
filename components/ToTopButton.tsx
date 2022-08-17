import { useState, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";

export function ToTopButton() {
  const [visible, setVisible] = useState(false);

  const toggleVisible = () => {
    console.log("Scrolling!");
    const scrolled = document.documentElement.scrollTop;
    const visibleWhenScrolled = scrolled > window.innerHeight * 1.6;
    setVisible(visibleWhenScrolled);
  };

  useEffect(() => {
    console.log("Attaching event listener");
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
      <FontAwesomeIcon icon={faArrowUp} />
    </button>
  );
}
