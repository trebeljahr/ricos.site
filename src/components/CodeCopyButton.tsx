import { DetailedHTMLProps, HTMLAttributes, useRef, useState } from "react";
import { FaCheck, FaClipboard } from "react-icons/fa";

export function CodeWithCopyButton({
  children,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>) {
  const [isCopied, setIsCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleClickCopy = async () => {
    const code = preRef.current?.textContent;

    if (code) {
      await navigator.clipboard.writeText(code);
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
        className="absolute right-2 size-6 z-10"
      >
        {isCopied ? (
          <FaCheck className="text-green-500 dark:text-green-400" />
        ) : (
          <FaClipboard className="text-gray-700 dark:text-gray-200" />
        )}
      </button>
      {children}
    </pre>
  );
}
