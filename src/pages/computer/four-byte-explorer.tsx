import { FourByteExplorer } from "@components/computer/FourByteExplorer";
import Layout from "@components/Layout";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";

export default function FourByteExplorerPage() {
  return (
    <Layout
      title="Four bytes, many meanings"
      description="Read 32 bits as a float, integer, UTF-8 text, or RGBA color."
      keywords={[]}
      url="computer/four-byte-explorer"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="four-byte-explorer" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Four bytes, many meanings
          </h1>
        </header>
        <FourByteExplorer />
        <ComputerDemoNav current="four-byte-explorer" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
