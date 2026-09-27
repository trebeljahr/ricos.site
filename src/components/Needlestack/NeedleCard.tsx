import { Card } from "@components/Card";
import clsx from "clsx";
import { hostLabel, type PublicNeedle } from "src/lib/needlestack/public";

const LEVEL_LABEL = { intro: "intro", deep: "deep" } as const;

/** Rico's rating, as pips: three is the front shelf, one is archive only. */
const Pips = ({ rating }: { rating: number }) => (
  <span className="text-xs tracking-widest text-accent">
    <span aria-hidden="true">{"●".repeat(rating) + "○".repeat(3 - rating)}</span>
    <span className="sr-only">Rated {rating} out of 3</span>
  </span>
);

type NeedleCardProps = {
  needle: PublicNeedle;
  /** "horizontal" for a path or the archive, "vertical" for the front shelf grid. */
  layout?: "horizontal" | "vertical";
  headingAs?: "h2" | "h3";
};

/**
 * One needle, as the site's card. The note is the excerpt because the note is
 * the whole point of the needlestack; the metadata row says where the link
 * goes, how long it takes and how deep it is, so a reader can skip it without
 * opening it.
 */
export const NeedleCard = ({
  needle,
  layout = "horizontal",
  headingAs = "h3",
}: NeedleCardProps) => {
  const meta = [
    hostLabel(needle.url),
    needle.minutes ? `${needle.minutes} min` : undefined,
    needle.level ? LEVEL_LABEL[needle.level] : undefined,
  ].filter(Boolean);

  return (
    <Card
      link={needle.url}
      title={needle.title}
      external
      layout={layout}
      headingAs={headingAs}
      typeLabel={needle.type}
      excerpt={needle.note}
      className={clsx(layout === "horizontal" && "mb-0")}
    >
      <div
        className={clsx(
          "flex flex-wrap items-center gap-tight text-sm text-gray-500 dark:text-gray-400",
          needle.note ? "mt-label" : "mt-tight",
        )}
      >
        <Pips rating={needle.rating} />
        {meta.length > 0 && <span>{meta.join(" · ")}</span>}
      </div>
    </Card>
  );
};
