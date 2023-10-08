import { ShowAfterScrolling } from "./ShowAfterScrolling";

export function ToTopButton() {
  return (
    <ShowAfterScrolling hideAgain={true}>
      <button
        id="to-top-button"
        onClick={() => {
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        }}
      >
        <span className="icon-arrow-up"></span>
      </button>
    </ShowAfterScrolling>
  );
}
