import { InstructionEncoder } from "@components/computer/InstructionEncoder";
import Layout from "@components/Layout";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";

export default function InstructionEncoderPage() {
  return (
    <Layout title="From instruction to bytes" description="Encode a toy CPU instruction, then watch the CPU decode and execute it." keywords={[]} url="computer/instruction-encoder" noindex fillViewport>
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="instruction-encoder" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">From instruction to bytes</h1>
        </header>
        <InstructionEncoder />
        <ComputerDemoNav current="instruction-encoder" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
