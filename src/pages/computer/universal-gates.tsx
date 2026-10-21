import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { UniversalGates } from "@components/computer/UniversalGates";
import Layout from "@components/Layout";

export default function UniversalGatesPage() {
  return (
    <Layout
      title="Build every gate from NAND or NOR"
      description="Build seven logic functions using only NAND gates or only NOR gates, with independent challenges and truth-table checks."
      keywords={[]}
      url="computer/universal-gates"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="universal-gates" />
        <header className="mb-10 mt-10 max-w-prose">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
            Build every gate from NAND or NOR
          </h1>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <code>{"<UniversalGates />"}</code>
          </p>
        </header>
        <UniversalGates />
        <ComputerDemoNav current="universal-gates" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
