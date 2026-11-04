import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SkeletonPlayer } from "@components/computer/SkeletonPlayer";
import Layout from "@components/Layout";

export default function SkeletonPlayerPage() {
  return (
    <Layout
      title="Play keyframes through a skeleton"
      description="From keyframes to a pose to matrices to moving vertices."
      keywords={[]}
      url="computer/skeleton-player"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="skeleton-player" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            ANIMATING A SKELETON
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <SkeletonPlayer />
        </div>
        <ComputerDemoNav current="skeleton-player" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
