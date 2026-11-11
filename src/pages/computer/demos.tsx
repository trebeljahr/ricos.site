import { DemoReviewList } from "@components/demoReview/DemoReviewList";
import Layout from "@components/Layout";
import type { GetServerSideProps } from "next";
import type { ReviewState } from "src/lib/demoReview";
import { readDemoReviews } from "src/lib/demoReviewStore";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";

// All computer demos, sorted by Rico's review (DemoReviewList).

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
        <DemoReviewList plainClassName="mt-16" review={review} series="computer" />
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
  return { props: { review: { reviews: readDemoReviews("computer") } } };
};
