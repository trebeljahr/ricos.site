import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { WeightPaint } from "@components/computer/WeightPaint";
import Layout from "@components/Layout";

export default function WeightPaintPage() {
  return (
    <Layout
      title="Paint vertex weights on a T. rex"
      description="Paint how much each bone moves each vertex, and see the mesh follow."
      keywords={[]}
      url="computer/weight-paint"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="weight-paint" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            WEIGHT PAINTING
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <WeightPaint />
        </div>
        <ComputerDemoNav current="weight-paint" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
