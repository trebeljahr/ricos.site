import { EightBitAdder, FullAdder, HalfAdder } from "@components/computer/Adders";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";

export default function AddersPage() {
  return (
    <Layout
      title="Add bits with gates"
      description="A half adder, a full adder and eight full adders in a row that add two bytes."
      keywords={[]}
      url="computer/adders"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="adders" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            ADDERS
          </h1>
        </header>
        {/* The width of a chapter column, where these are embedded. */}
        <div className="mx-auto max-w-prose">
          <h2>
            <code>{"<HalfAdder sumOnly />"}</code>
          </h2>
          <HalfAdder sumOnly />
          <h2>
            <code>{"<HalfAdder />"}</code>
          </h2>
          <HalfAdder />
          <h2>
            <code>{"<FullAdder />"}</code>
          </h2>
          <FullAdder />
          <h2>
            <code>{"<EightBitAdder />"}</code>
          </h2>
          <EightBitAdder />
        </div>
        <ComputerDemoNav current="adders" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
