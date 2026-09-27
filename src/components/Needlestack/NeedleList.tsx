import clsx from "clsx";
import type { PublicNeedle } from "src/lib/needlestack/public";
import { NeedleCard } from "./NeedleCard";

type NeedleListProps = {
  needles: PublicNeedle[];
  /** Shown instead of the list when a path or a filter has nothing to show yet. */
  empty?: string;
  /** The needle the random button just picked: ringed, so the eye finds it. */
  highlightId?: string | null;
  headingAs?: "h2" | "h3";
};

/**
 * A column of needles. `li[data-needle]` is what the archive's view transition
 * animates and what the random button scrolls to, so the markup lives here and
 * not in the pages.
 */
export const NeedleList = ({ needles, empty, highlightId, headingAs = "h3" }: NeedleListProps) => {
  if (needles.length === 0) {
    return empty ? <p className="text-gray-500 dark:text-gray-400">{empty}</p> : null;
  }

  return (
    <ul className="not-prose grid list-none grid-cols-1 gap-para p-0">
      {needles.map((needle) => (
        <li
          key={needle.id}
          id={`needle-${needle.id}`}
          data-needle
          className={clsx(
            "scroll-mt-24 rounded-xl",
            highlightId === needle.id &&
              "ring-2 ring-accent ring-offset-4 ring-offset-white dark:ring-offset-gray-950",
          )}
        >
          <NeedleCard needle={needle} headingAs={headingAs} />
        </li>
      ))}
    </ul>
  );
};
