import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { AdditionTable, FullAdderTable, GateTruthTable } from "@components/computer/TruthTables";
import Layout from "@components/Layout";

export default function TruthTablesPage() {
  return (
    <Layout
      title="Truth tables"
      description="Flip the inputs of a gate or an adder and see its row light up in the truth table."
      keywords={[]}
      url="computer/truth-tables"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="truth-tables" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            TRUTH TABLES
          </h1>
        </header>
        {/* The width of a chapter column, where these are embedded. */}
        <div className="mx-auto max-w-prose">
          <h2>
            <code>{"<GateTruthTable />"}</code>
          </h2>
          <GateTruthTable />
          <h2>
            <code>{"<AdditionTable />"}</code>
          </h2>
          <AdditionTable />
          <h2>
            <code>{"<FullAdderTable />"}</code>
          </h2>
          <FullAdderTable />
        </div>
        <ComputerDemoNav current="truth-tables" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
