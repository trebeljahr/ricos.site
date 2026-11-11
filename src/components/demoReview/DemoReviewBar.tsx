import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  type DemoReview as DemoReviewRecord,
  nextInQueue,
  queueCounts,
  type ReviewRound,
  type ReviewState,
  roundOf,
} from "src/lib/demoReview";
import { demoHref, demoTitle, type ReviewSeries, seriesDemos } from "src/lib/demoReviewSeries";
import {
  type DemoReviewApi,
  fetchDemoReview,
  HOVER_BORDER,
  HOVER_TEXT,
  NoteField,
  ReviewImages,
  SaveError,
  useDemoReview,
  VerdictButtons,
} from "./DemoReview";

// The review, on the demo being looked at. ComputerDemoNav and the piano demo
// pages only load this under `next dev`; on another machine the endpoint 404s and
// nothing shows.

function Controls({
  series,
  current,
  title,
  review,
}: {
  series: ReviewSeries;
  current: string;
  title: string;
  review: DemoReviewApi;
}) {
  const [focusNote, setFocusNote] = useState(false);
  const { state, change, addImages } = review;
  const saved = state.reviews[current];
  const saveNote = useCallback((note: string) => change(current, { note }), [change, current]);
  const saveImages = useCallback(
    (files: File[]) => addImages(current, files),
    [addImages, current],
  );
  const demos = seriesDemos(series);
  const next = nextInQueue(demos, state, current);
  const { fresh, reworked } = queueCounts(demos, state);

  return (
    <div className="mt-label rounded border border-gray-300 p-label dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-label">
        <VerdictButtons
          onReject={() => setFocusNote(true)}
          review={review}
          slug={current}
          title={title}
        />
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          To look at: {fresh} new, {reworked} reworked
        </span>
        {next && (
          <Link
            className={clsx(
              "inline-flex min-h-10 min-w-0 items-center rounded border border-gray-300 px-3 text-sm font-medium text-gray-800 transition-colors dark:border-gray-700 dark:text-gray-200",
              HOVER_BORDER[series],
              HOVER_TEXT[series],
            )}
            href={demoHref(series, next.slug)}
          >
            Next to look at: {next.title} →
          </Link>
        )}
      </div>
      {/* Its own row: notes run long, and screenshots go in here too. */}
      <NoteField
        className="mt-label max-h-96 overflow-y-auto"
        focus={focusNote}
        initial={saved?.note ?? ""}
        onDone={() => setFocusNote(false)}
        onImages={saveImages}
        onSave={saveNote}
        title={title}
      />
      <ReviewImages
        images={saved?.images}
        series={series}
        onRemove={(name) =>
          change(current, { images: (saved?.images ?? []).filter((image) => image !== name) })
        }
      />
      <SaveError message={review.saveError} />
      <FinishedRounds review={saved} series={series} />
    </div>
  );
}

function Round({
  series,
  round,
  number,
}: {
  series: ReviewSeries;
  round: ReviewRound;
  number: number;
}) {
  return (
    <div className="mt-label text-sm text-gray-600 dark:text-gray-400">
      <p className="m-0 font-medium text-gray-800 dark:text-gray-200">Round {number}</p>
      <p className="m-0 mt-hair whitespace-pre-wrap line-through">{round.note}</p>
      <ReviewImages images={round.images} series={series} />
      <p className="m-0 mt-hair whitespace-pre-wrap">
        Addressed: {round.summary}
        {round.commit && <span className="ml-tight font-mono text-xs">{round.commit}</span>}
      </p>
    </div>
  );
}

/** What this demo went through: the last round in full, earlier ones folded away. */
function FinishedRounds({
  series,
  review,
}: {
  series: ReviewSeries;
  review: DemoReviewRecord | undefined;
}) {
  const rounds = review?.rounds ?? [];
  if (rounds.length === 0) return null;
  const earlier = rounds.slice(0, -1);
  return (
    <>
      <p className="m-0 mt-label font-mono text-xs text-gray-500 dark:text-gray-400">
        Now on round {roundOf(review)}
      </p>
      <Round number={rounds.length} round={rounds[rounds.length - 1]} series={series} />
      {earlier.length > 0 && (
        <details className="mt-label text-sm text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer">Earlier rounds</summary>
          {earlier.map((round, index) => (
            <Round key={round.addressedAt} number={index + 1} round={round} series={series} />
          ))}
        </details>
      )}
    </>
  );
}

function Loaded({
  series,
  current,
  title,
  initial,
}: {
  series: ReviewSeries;
  current: string;
  title: string;
  initial: ReviewState;
}) {
  const review = useDemoReview(series, initial);
  return <Controls current={current} review={review} series={series} title={title} />;
}

export function DemoReviewBar({ series, current }: { series: ReviewSeries; current: string }) {
  const [initial, setInitial] = useState<ReviewState | null>(null);

  useEffect(() => {
    let live = true;
    fetchDemoReview(series)
      .then((state) => {
        if (live) setInitial(state);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [series]);

  if (!initial) return null;
  return (
    <Loaded
      current={current}
      initial={initial}
      series={series}
      title={demoTitle(series, current)}
    />
  );
}
