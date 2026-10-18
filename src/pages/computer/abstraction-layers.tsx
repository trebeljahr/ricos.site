import { AbstractionLayers } from "@components/computer/AbstractionLayers";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";

export default function AbstractionLayersDemoPage() {
  return (
    <Layout
      title="Layers of abstraction"
      description="Open a computer like a nesting doll, from the app you are using down to voltages on wires."
      keywords={[]}
      url="computer/abstraction-layers"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="abstraction-layers" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Layers of abstraction
          </h1>
        </header>
        <div className="mx-auto max-w-5xl">
          <AbstractionLayers />
        </div>
        <ComputerDemoNav current="abstraction-layers" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
