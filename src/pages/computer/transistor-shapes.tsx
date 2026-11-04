import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { GateWirings } from "@components/computer/GateWirings";
import { TransistorAnatomy } from "@components/computer/TransistorAnatomy";
import Layout from "@components/Layout";

export default function TransistorShapesPage() {
  return (
    <Layout
      title="Four transistors in 3D"
      description="Turn and slice a BJT, a planar MOSFET, a FinFET and a gate-all-around transistor, then wire one gate five ways."
      keywords={[]}
      url="computer/transistor-shapes"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="transistor-shapes" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            FOUR TRANSISTORS, FIVE WIRINGS
          </h1>
        </header>
        <div className="mx-auto flex max-w-3xl flex-col gap-group">
          <TransistorAnatomy />
          <GateWirings />
        </div>
        <ComputerDemoNav current="transistor-shapes" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
