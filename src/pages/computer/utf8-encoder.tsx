import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { Utf8Encoder } from "@components/computer/Utf8Encoder";
import Layout from "@components/Layout";

export default function Utf8EncoderPage() {
  return (
    <Layout
      title="Pack a code point into UTF-8 bytes"
      description="Flip the bits of a code point and watch them move into UTF-8 bytes."
      keywords={[]}
      url="computer/utf8-encoder"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="utf8-encoder" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            UTF-8 ENCODER
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <Utf8Encoder />
        </div>
        <ComputerDemoNav current="utf8-encoder" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
