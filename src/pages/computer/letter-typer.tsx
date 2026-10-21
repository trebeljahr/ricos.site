import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { LetterTyper } from "@components/computer/LetterTyper";
import Layout from "@components/Layout";

export default function LetterTyperPage() {
  return (
    <Layout
      title="Type letters, see five bits"
      description="Type letters and read each character as five bits using the fixed alphabet."
      keywords={[]}
      url="computer/letter-typer"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="letter-typer" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            LETTER TYPER
          </h1>
        </header>
        {/* The width of a chapter's text column, where the demo is embedded. */}
        <div className="mx-auto max-w-prose">
          <LetterTyper />
        </div>
        <ComputerDemoNav current="letter-typer" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
