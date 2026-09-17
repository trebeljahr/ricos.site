import clsx from "clsx";
import { forwardRef, type ReactNode } from "react";

type EmojiButtonProps = {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

// Reset every button default so the emoji sits in its heading exactly like plain text.
export const EmojiButton = forwardRef<HTMLButtonElement, EmojiButtonProps>(
  ({ label, children, onClick, className }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "relative inline cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 font-[inherit] leading-[inherit] text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
        className,
      )}
    >
      <span className="inline-block">{children}</span>
    </button>
  ),
);
EmojiButton.displayName = "EmojiButton";
