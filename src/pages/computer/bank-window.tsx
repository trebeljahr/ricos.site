import { BankWindowDemo } from "@components/computer/BankWindowDemo";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";

export default function BankWindowPage() {
  return (
    <Layout
      title="Reach a bigger screen through a window"
      description="A 32×32 screen has 128 bytes. Eight addresses and a BANK register reach all of them, one 8×8 tile at a time."
      keywords={[]}
      url="computer/bank-window"
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <ComputerDemoNav current="bank-window" />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            Reach a bigger screen through a window
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            A 32×32 screen has 128 bytes. The toy CPU reaches them through 8 data addresses, D0 to
            D7: a window onto one 8×8 tile. The BANK register at D8 picks the tile. Click a tile,
            then click pixels in the window.
          </p>
        </header>
        <BankWindowDemo />
        <ComputerDemoNav current="bank-window" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
