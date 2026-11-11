import { DemoReviewList } from "@components/demoReview/DemoReviewList";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import type { GetServerSideProps } from "next";
import type { ReviewState } from "src/lib/demoReview";
import { readDemoReviews } from "src/lib/demoReviewStore";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";

// Every piano demo, sorted by Rico's review (DemoReviewList). Development only,
// like the demos.

export default function PianoDemos({ review }: { review: ReviewState | null }) {
  return (
    <Layout
      title="Piano demos"
      description="All piano demos."
      keywords={[]}
      url="piano/demos"
      noindex
    >
      <PageMain>
        <Header title="Piano demos" subtitle="Development only." />
        <div className="not-prose">
          <DemoReviewList review={review} series="piano" />
        </div>
      </PageMain>
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
  return { props: { review: { reviews: readDemoReviews("piano") } } };
};
