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
    // figure that wraps the block, so it stays in the corner while a long
    // line scrolls the <pre> sideways underneath it.
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
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClickAndConfirm = () => {
    handleClick();
    setCopied(true);
    setCopies((count) => count + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleClickAndConfirm}
      aria-label={copied ? "Code copied" : "Copy the code"}
      className="code-copy-button absolute top-1.5 right-1.5 z-10 grid cursor-pointer place-items-center rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-black/5 hover:text-gray-900 motion-reduce:transition-none dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
    >
      {/* Both states share one grid cell, so the button keeps its width and
          the two icons cross-fade in place instead of swapping. */}
      <span
        aria-hidden="true"
        className={clsx(
          "col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none",
          copied ? "opacity-0" : "opacity-100",
        )}
      >
        <FaClipboard className="size-4" />
      </span>
      <span
        aria-hidden="true"
        className={clsx(
          "col-start-1 row-start-1 flex items-center gap-1 whitespace-nowrap text-green-700 transition-opacity duration-200 motion-reduce:transition-none dark:text-green-400",
          copied ? "opacity-100" : "opacity-0",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none">
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
        Copied
      </span>
    </button>
  );
};
