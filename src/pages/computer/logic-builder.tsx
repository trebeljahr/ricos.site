import { LogicBuilder } from "@components/computer/LogicBuilder";
import Layout from "@components/Layout";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";

export default function LogicBuilderPage() {
  return (
    <Layout
      title="Logic circuit builder"
      description="Build circuits and watch signals travel through gates."
      keywords={[]}
      url="computer/logic-builder"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-[1600px] px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="logic-builder" />
        <header className="mb-5 mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Logic circuit builder
          </h1>
          <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
            Build a circuit. Step through its signals.
          </p>
        </header>
        <LogicBuilder />
        <p className="mt-4 max-w-3xl text-xs leading-5 text-gray-500 dark:text-gray-400">
          Each step is half a clock cycle. Gates settle within the step; flip-flops store data on a
          rising edge. Saved circuits stay in this browser. Export JSON for a portable copy.
        </p>
        <ComputerDemoNav current="logic-builder" bottom />
      </main>
    </Layout>
  );
}
export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
