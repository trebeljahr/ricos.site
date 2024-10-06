import { FiArrowUp } from "react-icons/fi";
import { ShowAfterScrolling } from "./ShowAfterScrolling";
export function ToTopButton() {
  return (
    <ShowAfterScrolling>
      <button
        id="to-top-button"
        onClick={() => {
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        }}
        className="flex justify-center items-center z-10"
      >
        <FiArrowUp />
      </button>
    </ShowAfterScrolling>
  );
}
