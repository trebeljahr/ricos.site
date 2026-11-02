import { ByteExplorer } from "@components/computer/ByteExplorer";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import { getSeriesStatusProps } from "src/lib/computerSeriesStatus";

export default function ByteExplorerPage({ seriesIsOut }: { seriesIsOut: boolean }) {
  return (
    <Layout
      title="One byte, many meanings"
      description="Explore how eight bits can become numbers, text, or color."
      keywords={[]}
      url="computer/byte-explorer"
      noindex={!seriesIsOut}
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="byte-explorer" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            BYTE INTERPRETER
          </h1>
        </header>
        <ByteExplorer />
        <ComputerDemoNav current="byte-explorer" bottom />
      </main>
    </Layout>
  );
}

export const getStaticProps = getSeriesStatusProps;
