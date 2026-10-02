import { ProgramStepper } from "@components/computer/ProgramStepper";
import Layout from "@components/Layout";
import Link from "next/link";

export default function ProgramStepperPage() {
  return (
    <Layout
      title="From source code to CPU steps"
      description="Compile a tiny program to bytes and trace what each CPU instruction changes."
      keywords={[]}
      url="computer/program-stepper"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-20 pt-5 sm:px-6 sm:pt-8">
        <Link
          href="/computer"
          className="text-sm text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-300"
        >
          ← All computer demos
        </Link>
        <header className="mb-6 mt-7 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-500">
            The living CPU
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
            Where does a program go when it runs?
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
            Write a small program. Compile it to instruction bytes. Then pause at every fetch,
            decode, and execution step to see which byte moves and what changes.
          </p>
        </header>
        <ProgramStepper />
        <p className="mt-5 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
          This is a deliberately small machine: separate code and data memory, fixed two-byte
          instructions, and an 8-bit accumulator. Its compiler produces bytes, not physical
          currents. Real CPUs and operating systems add many layers.
        </p>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
