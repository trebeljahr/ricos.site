import { ProgramStepper } from "@components/computer/ProgramStepper";
import Layout from "@components/Layout";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";

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
        <ComputerDemoNav current="program-stepper" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            From source code to CPU steps
          </h1>
        </header>
        <ProgramStepper />
        <ComputerDemoNav current="program-stepper" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
