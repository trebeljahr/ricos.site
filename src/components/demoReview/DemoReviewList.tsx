import clsx from "clsx";
import Link from "next/link";
import {
  type DemoReview,
  groupByStage,
  isReworked,
  queueCounts,
  queueInOrder,
  REVIEW_STAGES,
  type ReviewStage,
  type ReviewState,
  roundOf,
  stageOf,
} from "src/lib/demoReview";
import { demoHref, type ReviewSeries, seriesDemos } from "src/lib/demoReviewSeries";
import { HOVER_TEXT } from "./DemoReview";

// All demos of a series, for looking through them: what still needs a look on
// top, with reworked demos last, then what was rejected and not addressed yet,
// then what is accepted. Verdicts are set on the demo pages (DemoReviewBar). The
// order only shows on this machine (see demoReviewStore.ts); from another device,
// say a phone on the same Wi-Fi, this is the plain list.

const STAGE_TITLES: Record<ReviewStage, string> = {
  queue: "To look at",
  rejected: "Rejected",
  accepted: "Accepted",
};

type Demo = ReturnType<typeof seriesDemos>[number];

function DemoRow({
  series,
  demo,
  review,
  reworked = false,
}: {
  series: ReviewSeries;
  demo: Demo;
  review?: DemoReview;
  reworked?: boolean;
}) {
  const number = seriesDemos(series).findIndex(({ slug }) => slug === demo.slug) + 1;
  return (
    <li className="border-b border-gray-300 dark:border-gray-700">
      <Link
        className={clsx("group block py-stack transition-colors", HOVER_TEXT[series])}
        href={demoHref(series, demo.slug)}
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-stack gap-y-hair">
          <span className="font-mono text-sm text-gray-500">{String(number).padStart(2, "0")}</span>
          <strong className="min-w-0 text-xl font-semibold text-gray-950 group-hover:text-inherit dark:text-white">
            {demo.title}
          </strong>
          {(review?.rounds?.length ?? 0) > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Round {roundOf(review)}
            </span>
          )}
        </span>
        {review?.note && (
          <span className="mt-hair block whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
            {review.note}
          </span>
        )}
        {(review?.images?.length ?? 0) > 0 && (
          <span className="mt-hair block font-mono text-xs text-gray-500 dark:text-gray-400">
            {review?.images?.length} screenshot{review?.images?.length === 1 ? "" : "s"}
          </span>
        )}
        {reworked && (
          <span className="mt-hair block text-sm text-gray-600 dark:text-gray-400">
            Addressed: {review?.rounds?.at(-1)?.summary}
          </span>
        )}
      </Link>
    </li>
  );
}

function ReviewedList({ series, state }: { series: ReviewSeries; state: ReviewState }) {
  const demos = seriesDemos(series);
  const groups = groupByStage(demos, (slug) => stageOf(state, slug));
  groups.queue = queueInOrder(demos, state);
  const { fresh, reworked } = queueCounts(demos, state);
  return (
    <>
      {REVIEW_STAGES.map((stage) => (
        <section className="mt-section" key={stage}>
          <h2 className="m-0 flex items-baseline gap-label text-lg font-semibold text-gray-950 dark:text-white">
            {STAGE_TITLES[stage]}
            <span className="font-mono text-sm font-normal text-gray-500">
              {stage === "queue" ? `${fresh} new, ${reworked} reworked` : groups[stage].length}
            </span>
          </h2>
          <ol className="mt-label list-none border-t border-gray-300 p-0 dark:border-gray-700">
            {groups[stage].map((demo) => (
              <DemoRow
                demo={demo}
                key={demo.slug}
                review={state.reviews[demo.slug]}
                reworked={isReworked(state, demo.slug)}
                series={series}
              />
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}

/** The demos sorted by review stage, or in series order where there is no review. */
export function DemoReviewList({
  series,
  review,
  plainClassName,
}: {
  series: ReviewSeries;
  review: ReviewState | null;
  /** Spacing of the plain list. */
  plainClassName?: string;
}) {
  if (review) return <ReviewedList series={series} state={review} />;
  return (
    <ol
      className={clsx(
        "list-none border-t border-gray-300 p-0 dark:border-gray-700",
        plainClassName,
      )}
    >
      {seriesDemos(series).map((demo) => (
        <DemoRow demo={demo} key={demo.slug} series={series} />
      ))}
    </ol>
  );
}
