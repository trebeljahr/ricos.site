import { AsciiTyper } from "@components/computer/AsciiTyper";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";

export default function AsciiTyperPage() {
  return (
    <Layout
      title="Type text, see the bits"
      description="Type text and read each character as seven ASCII bits."
      keywords={[]}
      url="computer/ascii-typer"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="ascii-typer" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            ASCII TYPER
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <AsciiTyper />
        </div>
        <ComputerDemoNav current="ascii-typer" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
