import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { CpuCircuitStepper } from "@components/computer/CpuCircuitStepper";
import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";

export default function CpuCircuitPage() {
  return (
    <Layout
      title="Run a program on the CPU circuit"
      description="Compile a tiny program and clock it through the toy CPU's circuit, one micro-step at a time."
      keywords={[]}
      url="computer/cpu-circuit"
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <ComputerDemoNav current="cpu-circuit" />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Run a program on the CPU circuit
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            Each clock tick moves both views one micro-step: the source line and instruction on the
            left, and the circuit below. Control lines that are on glow yellow. Click a block in the
            circuit to see its gates.
          </p>
        </header>
        <CpuCircuitStepper />
        <ComputerDemoNav current="cpu-circuit" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
