import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { EndianReader } from "@components/computer/EndianReader";
import Layout from "@components/Layout";

export default function EndianReaderPage() {
  return (
    <Layout
      title="Two bytes, four reading orders"
      description="Read the same 16 bits in four bit and byte orders."
      keywords={[]}
      url="computer/endian-reader"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="endian-reader" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            ENDIAN READER
          </h1>
        </header>
        {/* The width of a chapter column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <EndianReader />
        </div>
        <ComputerDemoNav current="endian-reader" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
