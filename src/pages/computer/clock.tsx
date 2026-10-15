import { ClockScope } from "@components/computer/ClockScope";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SignalEdges } from "@components/computer/SignalEdges";
import Layout from "@components/Layout";

export default function ClockDemosPage() {
  return (
    <Layout
      title="The clock"
      description="See the clean signal a clock should give, and how fast a modern clock ticks."
      keywords={[]}
      url="computer/clock"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="clock" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            THE CLOCK
          </h1>
        </header>
        {/* The width of a chapter column, where these two are embedded. */}
        <div className="mx-auto max-w-prose">
          <h2>
            <code>{"<SignalEdges />"}</code>
          </h2>
          <SignalEdges />
          <h2>
            <code>{"<ClockScope />"}</code>
          </h2>
          <ClockScope />
        </div>
        <ComputerDemoNav current="clock" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
