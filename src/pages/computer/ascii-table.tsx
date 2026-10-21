import { AsciiTable } from "@components/computer/AsciiTable";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";

export default function AsciiTablePage() {
  return (
    <Layout
      title="Explore the ASCII table"
      description="Look up all 128 ASCII entries as characters, decimal numbers, hex, and seven bits."
      keywords={[]}
      url="computer/ascii-table"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="ascii-table" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            ASCII TABLE
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <AsciiTable />
        </div>
        <ComputerDemoNav current="ascii-table" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
