import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { Transform3d } from "@components/computer/Transform3d";
import Layout from "@components/Layout";

export default function Transform3dPage() {
  return (
    <Layout
      title="Turn, scale and move in 3D"
      description="Build a 4×4 matrix from turns, scales and moves."
      keywords={[]}
      url="computer/matrices-in-3d"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="matrices-in-3d" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            MATRICES IN 3D
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <Transform3d />
        </div>
        <ComputerDemoNav current="matrices-in-3d" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
