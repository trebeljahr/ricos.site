import { FiArrowUp } from "react-icons/fi";
import { ShowAfterScrolling } from "./ShowAfterScrolling";
export function ToTopButton() {
  return (
    <ShowAfterScrolling>
      <button
        onClick={() => {
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        }}
        className="fixed bottom-[2vmin] right-[2vmin] pointer w-fit h-fit p-2 rounded-full flex justify-center items-center z-10 border-none bg-blue-300 text-center hover:bg-blue-400 sm:bottom-[4vmin] sm:right-[8vmin] text-black"
        aria-label="Scroll to top"
      >
        <FiArrowUp className="w-8 h-8" />
      </button>
    </ShowAfterScrolling>
  );
}
