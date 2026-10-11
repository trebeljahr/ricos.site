import { Codebook } from "@components/computer/Codebook";
import { CodebookMismatch } from "@components/computer/CodebookMismatch";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SwitchStates } from "@components/computer/SwitchStates";
import Layout from "@components/Layout";

export default function CodebookDemosPage() {
  return (
    <Layout
      title="Switches, states and codebooks"
      description="See how switches store states and how a codebook gives each state a meaning."
      keywords={[]}
      url="computer/codebook"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="codebook" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            SWITCHES AND CODEBOOKS
          </h1>
        </header>
        {/* The width of a chapter column, where these three are embedded. */}
        <div className="mx-auto max-w-prose">
          <h2>
            <code>{"<SwitchStates />"}</code>
          </h2>
          <SwitchStates />
          <h2>
            <code>{"<Codebook />"}</code>
          </h2>
          <Codebook />
          <h2>
            <code>{"<CodebookMismatch />"}</code>
          </h2>
          <CodebookMismatch />
        </div>
        <ComputerDemoNav current="codebook" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
