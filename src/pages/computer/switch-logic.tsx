import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SwitchLogic } from "@components/computer/SwitchLogic";
import Layout from "@components/Layout";

export default function SwitchLogicPage() {
  return (
    <Layout
      title="Two switches, one lamp"
      description="Wire two switches to a lamp, try every case, then see which logic gate the wiring is."
      keywords={[]}
      url="computer/switch-logic"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="switch-logic" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            SWITCHES BECOME LOGIC
          </h1>
        </header>
        {/* The width of a chapter column, where these are embedded. */}
        <div className="mx-auto max-w-prose">
          <h2>
            <code>{"<SwitchLogic />"}</code>
          </h2>
          <SwitchLogic />
          <h2>
            <code>{'<SwitchLogic wiring="parallel" fixed />'}</code>
          </h2>
          <SwitchLogic wiring="parallel" fixed />
        </div>
        <ComputerDemoNav current="switch-logic" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
