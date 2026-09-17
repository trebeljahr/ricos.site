import type { ReactNode } from "react";

type HandButtonProps = {
  children: ReactNode;
  onClick?: () => void;
};

// Reset every button default so the hand sits in the h1 exactly like the plain emoji.
export const HandButton = ({ children, onClick }: HandButtonProps) => (
  <button
    type="button"
    aria-label="Wave back"
    onClick={onClick}
    className="inline cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 font-[inherit] leading-[inherit] text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
  >
    <span className="inline-block">{children}</span>
  </button>
);
