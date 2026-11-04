import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { MatrixPlayground } from "@components/computer/MatrixPlayground";
import Layout from "@components/Layout";

export default function MatrixPlaygroundPage() {
  return (
    <Layout
      title="Multiply matrices, move a shape"
      description="Stack up matrix transforms, or drag where the axes land."
      keywords={[]}
      url="computer/matrix-playground"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="matrix-playground" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            MATRIX PLAYGROUND
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <MatrixPlayground />
        </div>
        <ComputerDemoNav current="matrix-playground" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
