import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { UnicodeInspector } from "@components/computer/UnicodeInspector";
import Layout from "@components/Layout";

export default function UnicodeInspectorPage() {
  return (
    <Layout
      title="Take any text apart"
      description="Type any text and read its graphemes, code points and UTF-8 bytes."
      keywords={[]}
      url="computer/unicode-inspector"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="unicode-inspector" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            TEXT INSPECTOR
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <UnicodeInspector />
        </div>
        <ComputerDemoNav current="unicode-inspector" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
