import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { DieZoom } from "@components/computer/DieZoom";
import Layout from "@components/Layout";

export default function DieZoomPage() {
  return (
    <Layout
      title="Zoom into a real chip"
      description="Zoom from a coin down to the wires of a Pentium II die."
      keywords={[]}
      url="computer/die-zoom"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="die-zoom" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            ZOOM INTO A CHIP
          </h1>
        </header>
        {/* The width of a chapter column, where these are embedded. */}
        <div className="mx-auto max-w-prose">
          <h2>
            <code>{"<DieZoom />"}</code>
          </h2>
          <DieZoom />
        </div>
        <ComputerDemoNav current="die-zoom" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
