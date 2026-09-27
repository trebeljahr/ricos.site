import { GlitterPool, useGlitter } from "@components/Glitter";
import { FaClipboard } from "@components/Icons";
import clsx from "clsx";
import { type DetailedHTMLProps, type HTMLAttributes, useEffect, useRef, useState } from "react";

export function CodeWithCopyButton({
  children,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);

  const handleClickCopy = async () => {
    const codeElem = preRef.current;
    if (!codeElem) return;

    const clonedElement = codeElem.cloneNode(true) as HTMLElement;

    const nodesToRemove = clonedElement.querySelectorAll(".diff.remove");
    for (const node of nodesToRemove) {
      node.remove();
    }

    const code = clonedElement.textContent;

    if (code) {
      const splitText = code.split("\n");

      const cleanedText = splitText.filter((str, index) => {
        if (str === "") return false;
        if (index === 0) return true;

        const lastLineWasEmpty = splitText[index - 1] === "";
        const currentLineIsEmpty = str.trim() === "";
        if (lastLineWasEmpty && currentLineIsEmpty) return false;

        return true;
      });

      await navigator.clipboard.writeText(cleanedText.join("\n"));
    }
  };

  return (
    // No `relative` here on purpose: the button is positioned against the
    // figure that wraps the block, so it sits still in the corner while a
    // long line scrolls the <pre> sideways underneath it. Leaving the <pre>
    // static also keeps its `overflow-x` from clipping the glitter.
    <pre
      ref={preRef}
      {...props}
      className="border border-gray-500"
      data-theme="github-dark-dimmed github-light"
    >
      <CopyButton handleClick={handleClickCopy} />
      {children}
    </pre>
  );
}

type CopyButtonProps = {
  handleClick: () => void;
};

export const CopyButton = ({ handleClick }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  // Counted, not just flagged: the key remounts the check so `draw-check`
  // runs again on a second copy instead of sitting on its finished frame.
  const [copies, setCopies] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { glitterRef, burst } = useGlitter();
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClickAndConfirm = () => {
    handleClick();
    setCopied(true);
    setCopies((count) => count + 1);
    burst("up");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleClickAndConfirm}
      aria-label={copied ? "Code copied" : "Copy the code"}
      // The chip is centred on the first line, not parked at a fixed offset,
      // so it tracks the line height at every prose step. `0.5lh` only means
      // the code's half-line if the button carries the code's font size, and
      // the <pre>-to-<code> ratio changes at each step of
      // `prose md:prose-lg xl:prose-xl` (1, 8/9, 9/10) -- hence the three
      // sizes below. Line height itself is inherited unitless, so matching
      // the font size is enough. The offsets are the <pre>'s 1px border plus
      // its 0.5rem padding.
      className="code-copy-button absolute top-[calc(0.5rem+1px+0.5lh)] right-[calc(0.5rem+1px)] z-10 grid -translate-y-1/2 cursor-pointer place-items-center rounded-md bg-(--shiki-light-bg) px-1.5 py-1 text-[1em] text-gray-500 md:text-[0.888889em] xl:text-[0.9em] transition-colors hover:bg-gray-100 hover:text-gray-900 motion-reduce:transition-none dark:bg-(--shiki-dark-bg) dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
    >
      <GlitterPool ref={glitterRef} />
      {/* Both icons share one grid cell, so the chip keeps the width of a
          single glyph and the two cross-fade in place. */}
      <span
        aria-hidden="true"
        className={clsx(
          "col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none",
          copied ? "opacity-0" : "opacity-100",
        )}
      >
        <FaClipboard className="size-[1.1em]" />
      </span>
      <span
        aria-hidden="true"
        className={clsx(
          "col-start-1 row-start-1 text-green-600 transition-opacity duration-200 motion-reduce:transition-none dark:text-green-400",
          copied ? "opacity-100" : "opacity-0",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1em]" fill="none">
          <path
            key={copies}
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            className="animate-draw-check motion-reduce:animate-none"
          />
        </svg>
      </span>
    </button>
  );
};
