import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The pill every filter row on this site is built from: /quotes filters its
 * topics with it, the needlestack archive its topics, types, levels and
 * ratings. One place, so two pages of filters cannot drift apart.
 */
export const chipClass = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1 text-sm transition-colors",
    active
      ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  );

type FilterChipProps = {
  children: ReactNode;
  /** Filled in when on. Also sets aria-pressed, so a screen reader hears the state. */
  active?: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
};

export const FilterChip = ({
  children,
  active = false,
  onClick,
  label,
  className,
}: FilterChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    aria-label={label}
    onClick={onClick}
    className={clsx(chipClass(active), className)}
  >
    {children}
  </button>
);
