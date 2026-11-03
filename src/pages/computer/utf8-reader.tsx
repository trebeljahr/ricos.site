import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { Utf8Reader } from "@components/computer/Utf8Reader";
import Layout from "@components/Layout";

export default function Utf8ReaderPage() {
  return (
    <Layout
      title="Read a UTF-8 byte stream"
      description="Decode UTF-8 byte by byte, start in the middle, and damage the stream."
      keywords={[]}
      url="computer/utf8-reader"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="utf8-reader" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            UTF-8 READER
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <Utf8Reader />
        </div>
        <ComputerDemoNav current="utf8-reader" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
