import { DetailedHTMLProps, HTMLAttributes, useRef, useState } from "react";
import { FaCheck, FaClipboard } from "react-icons/fa";

export function CodeWithCopyButton({
  children,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>) {
  const [isCopied, setIsCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleClickCopy = async () => {
    const codeElem = preRef.current;
    if (!codeElem) return;

    const clonedElement = codeElem.cloneNode(true) as HTMLElement;

    const nodesToRemove = clonedElement.querySelectorAll(".diff.remove");
    nodesToRemove.forEach((node: Element) => {
      node.remove();
    });

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
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    }
  };

  return (
    <pre
      ref={preRef}
      {...props}
      className="relative border border-gray-500"
      data-theme="github-dark-dimmed github-light"
    >
      <button
        disabled={isCopied}
        onClick={handleClickCopy}
        className="w-fit h-fit absolute bottom-2 right-2 z-10 flex place-items-center"
      >
        {isCopied ? (
          <FaCheck className="size-6 text-green-500 dark:text-green-400" />
        ) : (
          <FaClipboard className="size-6 text-gray-700 dark:text-gray-200" />
        )}
      </button>
      {children}
    </pre>
  );
}
