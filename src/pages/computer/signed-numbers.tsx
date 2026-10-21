import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { SignedArithmetic, SignedNumberExplorer } from "@components/computer/SignedNumbers";
import Layout from "@components/Layout";

export default function SignedNumbersPage() {
  return (
    <Layout
      title="Signed numbers and overflow"
      description="Read the same bits four ways, then add and subtract signed integers with a gate circuit."
      keywords={[]}
      url="computer/signed-numbers"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="signed-numbers" />
        <header className="mb-4 mt-4">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            SIGNED NUMBERS
          </h1>
        </header>
        <h2>
          <code>{"<SignedNumberExplorer />"}</code>
        </h2>
        <SignedNumberExplorer />
        <h2>
          <code>{"<SignedArithmetic />"}</code>
        </h2>
        <SignedArithmetic />
        <ComputerDemoNav current="signed-numbers" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
