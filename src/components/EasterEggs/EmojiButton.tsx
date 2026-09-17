import clsx from "clsx";
import { forwardRef, type ReactNode, useRef } from "react";

type EmojiButtonProps = {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Wiggle now and then, and on every click, so the emoji reads as clickable. */
  hint?: boolean;
  /** Set false when the egg gives its own feedback on each click. */
  nudge?: boolean;
};

const NUDGE_WINDOW_MS = 2000;

// Same text in, same delay out, so server and client render the same style.
function hintDelay(label: string) {
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) % 11000;
  return `${-h}ms`;
}

// Reset every button default so the emoji sits in its heading exactly like plain text.
export const EmojiButton = forwardRef<HTMLButtonElement, EmojiButtonProps>(
  ({ label, children, onClick, className, hint = true, nudge: nudgeOnClick = true }, ref) => {
    const wiggleRef = useRef<HTMLSpanElement>(null);
    const clickTimes = useRef<number[]>([]);

    // Each quick click wiggles harder, so the next click feels like it builds toward something.
    const nudge = () => {
      const el = wiggleRef.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const now = Date.now();
      clickTimes.current = [...clickTimes.current.filter((t) => now - t < NUDGE_WINDOW_MS), now];
      const strength = Math.min(clickTimes.current.length, 4);
      const angle = 6 + strength * 4;
      el.animate(
        [
          { rotate: "0deg", scale: "1" },
          { rotate: `${-angle}deg`, scale: `${1 + strength * 0.05}` },
          { rotate: `${angle * 0.7}deg` },
          { rotate: `${-angle * 0.3}deg` },
          { rotate: "0deg", scale: "1" },
        ],
        { duration: 380, easing: "ease-out" },
      );
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        onClick={() => {
          if (hint && nudgeOnClick) nudge();
          onClick?.();
        }}
        className={clsx(
          "relative inline cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 font-[inherit] leading-[inherit] text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
          className,
        )}
      >
        <span
          ref={wiggleRef}
          className={clsx("inline-block", hint && "origin-bottom motion-safe:animate-egg-hint")}
          style={hint ? { animationDelay: hintDelay(label) } : undefined}
        >
          {children}
        </span>
      </button>
    );
  },
);
EmojiButton.displayName = "EmojiButton";
