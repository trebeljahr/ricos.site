import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { computerDemos } from "src/lib/computerDemos";
import { isReworked, nextInQueue, type ReviewState, stageOf } from "src/lib/demoReview";
import {
  type DemoReviewApi,
  fetchDemoReview,
  NoteField,
  SaveError,
  useDemoReview,
  VerdictButtons,
} from "./DemoReview";

// The review, on the demo being looked at. ComputerDemoNav only loads this under
// `next dev`; on another machine the endpoint 404s and nothing shows.

function Controls({
  current,
  title,
  review,
}: {
  current: string;
  title: string;
  review: DemoReviewApi;
}) {
  const [focusNote, setFocusNote] = useState(false);
  const { state, change } = review;
  const saved = state.reviews[current];
  const saveNote = useCallback((note: string) => change(current, { note }), [change, current]);
  const next = nextInQueue(computerDemos, state, current);
  const waiting = computerDemos.filter(({ slug }) => stageOf(state, slug) === "queue").length;

  return (
    <div className="mt-label rounded border border-gray-300 p-label dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-label">
        <VerdictButtons
          onReject={() => setFocusNote(true)}
          review={review}
          slug={current}
          title={title}
        />
        <NoteField
          className="min-w-48 flex-1"
          focus={focusNote}
          initial={saved?.note ?? ""}
          onDone={() => setFocusNote(false)}
          onSave={saveNote}
          title={title}
        />
        {isReworked(state, current) && (
          <span className="text-sm text-gray-500 dark:text-gray-400">Reworked</span>
        )}
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {waiting} to look at
        </span>
        {next && (
          <Link
            className="inline-flex min-h-10 min-w-0 items-center rounded border border-gray-300 px-3 text-sm font-medium text-gray-800 transition-colors hover:border-cyan-500 hover:text-cyan-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
            href={`/computer/${next.slug}`}
          >
            Next to look at: {next.title} →
          </Link>
        )}
      </div>
      <SaveError message={review.saveError} />
    </div>
  );
}

function Loaded({
  current,
  title,
  initial,
}: {
  current: string;
  title: string;
  initial: ReviewState;
}) {
  const review = useDemoReview(initial);
  return <Controls current={current} review={review} title={title} />;
}

export function DemoReviewBar({ current }: { current: string }) {
  const [initial, setInitial] = useState<ReviewState | null>(null);

  useEffect(() => {
    let live = true;
    fetchDemoReview()
      .then((state) => {
        if (live) setInitial(state);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const title = computerDemos.find(({ slug }) => slug === current)?.title ?? current;
  if (!initial) return null;
  return <Loaded current={current} initial={initial} title={title} />;
}
