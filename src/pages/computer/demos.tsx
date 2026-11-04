import Layout from "@components/Layout";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import {
  type DemoReview,
  groupByStage,
  isReworked,
  queueInOrder,
  REVIEW_STAGES,
  type ReviewStage,
  type ReviewState,
  roundOf,
  stageOf,
} from "src/lib/demoReview";
import { readDemoReviews } from "src/lib/demoReviewStore";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";
import { computerDemos } from "../../lib/computerDemos";

// All demos, for looking through them: what still needs a look on top, with
// reworked demos last, then what was rejected and not addressed yet, then what is
// accepted. Verdicts are set on the demo pages (DemoReviewBar). The order only
// shows on this machine (see demoReviewStore.ts); from another device, say a phone
// on the same Wi-Fi, this is the plain list.

const STAGE_TITLES: Record<ReviewStage, string> = {
  queue: "To look at",
  rejected: "Rejected",
  accepted: "Accepted",
};

type Demo = (typeof computerDemos)[number];

const numberOf = (slug: string) =>
  String(computerDemos.findIndex((demo) => demo.slug === slug) + 1).padStart(2, "0");

function DemoRow({
  demo,
  review,
  reworked = false,
}: {
  demo: Demo;
  review?: DemoReview;
  reworked?: boolean;
}) {
  return (
    <li className="border-b border-gray-300 dark:border-gray-700">
      <Link
        className="group block py-stack transition-colors hover:text-cyan-600 dark:hover:text-cyan-300"
        href={`/computer/${demo.slug}`}
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-stack gap-y-hair">
          <span className="font-mono text-sm text-gray-500">{numberOf(demo.slug)}</span>
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
          <span className="mt-hair block text-sm text-gray-600 dark:text-gray-400">
            {review.note}
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

function ReviewedList({ state }: { state: ReviewState }) {
  const groups = groupByStage(computerDemos, (slug) => stageOf(state, slug));
  groups.queue = queueInOrder(computerDemos, state);
  return (
    <>
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
              <DemoRow
                demo={demo}
                key={demo.slug}
                review={state.reviews[demo.slug]}
                reworked={isReworked(state, demo.slug)}
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
          <ReviewedList state={review} />
        ) : (
          <ol className="mt-16 list-none border-t border-gray-300 p-0 dark:border-gray-700">
            {computerDemos.map((demo) => (
              <DemoRow demo={demo} key={demo.slug} />
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
  return { props: { review: { reviews: readDemoReviews() } } };
};
