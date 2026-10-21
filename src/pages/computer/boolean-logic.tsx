import { BooleanExplainer } from "@components/computer/BooleanExplainer";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";

export default function BooleanLogicPage() {
  return (
    <Layout
      title="Read Boolean logic"
      description="Compare Boolean symbols, choose truth-table rows and see how the number of possible functions grows."
      keywords={[]}
      url="computer/boolean-logic"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="boolean-logic" />
        <header className="mx-auto mb-8 mt-8 max-w-prose">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
            Read Boolean logic
          </h1>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <code>{"<BooleanExplainer />"}</code>
          </p>
        </header>
        <div className="mx-auto max-w-prose">
          <BooleanExplainer />
        </div>
        <ComputerDemoNav current="boolean-logic" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
