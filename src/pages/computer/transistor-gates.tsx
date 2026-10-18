import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { TransistorGates } from "@components/computer/TransistorGates";
import Link from "next/link";
import Layout from "@components/Layout";

export default function TransistorGatesPage() {
  return (
    <Layout
      title="Gates wired from transistors"
      description="See how pMOS and nMOS transistors wire up NOT, NAND, NOR, AND and OR."
      keywords={[]}
      url="computer/transistor-gates"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="transistor-gates" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            GATES FROM TRANSISTORS
          </h1>
        </header>
        {/* The width of a chapter column, where these are embedded. */}
        <div className="mx-auto max-w-prose">
          <h2>
            <code>{"<TransistorGates />"}</code>
          </h2>
          <p>
            This viewer explains completed circuits. To design your own circuit from a behavior
            goal, open the construction challenge.
          </p>
          <p>
            <Link href="/computer/build-from-nand?level=cmos-not">
              Design a transistor inverter →
            </Link>
          </p>
          <TransistorGates />
          <h2>
            <code>{'<TransistorGates gate="nand" fixed />'}</code>
          </h2>
          <TransistorGates gate="nand" fixed />
        </div>
        <ComputerDemoNav current="transistor-gates" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
