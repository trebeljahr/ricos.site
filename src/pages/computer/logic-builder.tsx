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
        <header className="mb-5 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Logic circuit builder
          </h1>
        </header>
        <LogicBuilder />
        <ComputerDemoNav current="logic-builder" bottom />
      </main>
    </Layout>
  );
}
export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
