import {
  type DemoReviewApi,
  NoteField,
  SaveError,
  useDemoReview,
  VerdictButtons,
} from "@components/computer/DemoReview";
import Layout from "@components/Layout";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
  groupByStage,
  isReworked,
  REVIEW_STAGES,
  type ReviewStage,
  type ReviewState,
  stageOf,
} from "src/lib/demoReview";
import { readDemoReviews } from "src/lib/demoReviewStore";
import { readDemoWork } from "src/lib/demoWork";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";
import { computerDemos } from "../../lib/computerDemos";

// All demos, for looking through them: what still needs a look on top, then what
// was rejected and not worked on since, then what is accepted. The review only
// shows on this machine (see demoReviewStore.ts); from another device, say a
// phone on the same Wi-Fi, this is the plain list.

const STAGE_TITLES: Record<ReviewStage, string> = {
  queue: "To look at",
  rejected: "Rejected",
  accepted: "Accepted",
};

type Demo = (typeof computerDemos)[number];

const numberOf = (slug: string) =>
  String(computerDemos.findIndex((demo) => demo.slug === slug) + 1).padStart(2, "0");

function DemoTitle({ demo }: { demo: Demo }) {
  return (
    <Link
      className="group flex min-w-0 items-baseline gap-stack transition-colors hover:text-cyan-600 dark:hover:text-cyan-300"
      href={`/computer/${demo.slug}`}
    >
      <span className="font-mono text-sm text-gray-500">{numberOf(demo.slug)}</span>
      <strong className="min-w-0 text-xl font-semibold text-gray-950 group-hover:text-inherit dark:text-white">
        {demo.title}
      </strong>
    </Link>
  );
}

function ReviewRow({
  demo,
  review,
  focusNote,
  onReject,
  onNoteDone,
}: {
  demo: Demo;
  review: DemoReviewApi;
  focusNote: boolean;
  onReject: () => void;
  onNoteDone: () => void;
}) {
  const { state, change } = review;
  const saved = state.reviews[demo.slug];
  const [opened, setOpened] = useState(false);
  const showNote = opened || focusNote || Boolean(saved?.note) || saved?.verdict === "rejected";
  const saveNote = useCallback((note: string) => change(demo.slug, { note }), [change, demo.slug]);

  return (
    <li className="border-b border-gray-300 py-stack dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-label">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-stack gap-y-hair">
          <DemoTitle demo={demo} />
          {isReworked(state, demo.slug) && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Reworked since rejection
            </span>
          )}
        </div>
        <div className="flex items-center gap-tight">
          {!showNote && (
            <button
              className="min-h-10 px-2 text-sm text-gray-500 hover:text-cyan-700 dark:text-gray-400 dark:hover:text-cyan-300"
              onClick={() => setOpened(true)}
              type="button"
            >
              Add note
            </button>
          )}
          <VerdictButtons onReject={onReject} review={review} slug={demo.slug} title={demo.title} />
        </div>
      </div>
      {showNote && (
        <NoteField
          className="mt-label"
          focus={focusNote || opened}
          initial={saved?.note ?? ""}
          onDone={onNoteDone}
          onSave={saveNote}
          title={demo.title}
        />
      )}
    </li>
  );
}

function ReviewedList({ initial }: { initial: ReviewState }) {
  const review = useDemoReview(initial);
  // A demo just rejected stays where it is while its note is written, and moves
  // when the note is done.
  const [held, setHeld] = useState<{ slug: string; stage: ReviewStage } | null>(null);
  const groups = groupByStage(computerDemos, (slug) =>
    held?.slug === slug ? held.stage : stageOf(review.state, slug),
  );

  return (
    <>
      <SaveError message={review.saveError} />
      {REVIEW_STAGES.map((stage) => (
        <section className="mt-section" key={stage}>
          <h2 className="m-0 flex items-baseline gap-label text-lg font-semibold text-gray-950 dark:text-white">
            {STAGE_TITLES[stage]}
            <span className="font-mono text-sm font-normal text-gray-500">
              {groups[stage].length}
            </span>
          </h2>
          <ol className="mt-label list-none border-t border-gray-300 p-0 dark:border-gray-700">
            {groups[stage].map((demo) => (
              <ReviewRow
                demo={demo}
                focusNote={held?.slug === demo.slug}
                key={demo.slug}
                onNoteDone={() => setHeld(null)}
                onReject={() =>
                  setHeld({ slug: demo.slug, stage: stageOf(review.state, demo.slug) })
                }
                review={review}
              />
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}

export default function ComputerDemosIndex({ review }: { review: ReviewState | null }) {
  return (
    <Layout
      title="Computer demos"
      description="Interactive experiments for explaining how computers work."
      keywords={[]}
      url="computer/demos"
      noindex
      fillViewport
    >
      <main className="not-prose mx-auto w-full max-w-5xl px-4 pb-24 pt-16 sm:px-8 sm:pt-24">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-7xl">
          Computer demos
        </h1>
        {review ? (
          <ReviewedList initial={review} />
        ) : (
          <ol className="mt-16 list-none border-t border-gray-300 p-0 dark:border-gray-700">
            {computerDemos.map((demo) => (
              <li
                className="border-b border-gray-300 py-stack dark:border-gray-700"
                key={demo.slug}
              >
                <DemoTitle demo={demo} />
              </li>
            ))}
          </ol>
        )}
      </main>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<{
  review: ReviewState | null;
}> = async ({ req }) => {
  // First and literal: the production build inlines NODE_ENV, so everything
  // below is dead code there and the deployed route is a plain 404.
  if (process.env.NODE_ENV !== "development") return { notFound: true };
  if (!servesPrivateNotes(process.env, clientAddresses(req))) return { props: { review: null } };
  const reviews = readDemoReviews();
  return { props: { review: { reviews, work: readDemoWork(reviews) } } };
};
