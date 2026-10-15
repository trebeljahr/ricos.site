import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { LazyMount } from "@components/computer/LazyMount";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import dynamic from "next/dynamic";

const LogicBuilder = dynamic(
  () => import("@components/computer/LogicBuilder").then((module) => module.LogicBuilder),
  { ssr: false, loading: () => null },
);

// A test page for embedding: tutorial builders on different levels and a free
// builder share one page. Each mounts when it scrolls near; key presses,
// palettes and saved work stay with the builder they belong to.
const EMBEDS = [
  { title: "NOT from NAND", levels: ["not"] },
  { title: "Half adder and full adder", levels: ["half-adder", "full-adder"] },
  { title: "XOR, with your earlier gates", levels: ["xor"] },
  { title: "SR latch", levels: ["sr-latch"] },
];

const BUILDER_HEIGHT = "min(80svh, 760px)";

export default function BuildersOnOnePage() {
  return (
    <Layout
      title="Several circuit builders on one page"
      description="Tutorial builders on different levels and a free builder on one page, each loading as it scrolls near."
      keywords={[]}
      url="computer/builders-on-one-page"
      noindex
    >
      <PageMain>
        <ComputerDemoNav current="builders-on-one-page" />
        <Header
          title="Several circuit builders on one page"
          subtitle="Each builder below loads when you scroll near it. Undo, delete and select all act on the builder you used last."
        />
        {EMBEDS.map((embed) => (
          <section key={embed.title} className="not-prose mt-group">
            <h2 className="mb-label text-lg font-semibold">{embed.title}</h2>
            <LazyLogicTutorial title={embed.title} levels={embed.levels} height={BUILDER_HEIGHT} />
          </section>
        ))}
        <section className="not-prose mt-group">
          <h2 className="mb-label text-lg font-semibold">Free builder</h2>
          <LazyMount
            height={BUILDER_HEIGHT}
            label="Free builder"
            placeholder={<p className="p-stack">The free builder loads when you scroll here.</p>}
          >
            <LogicBuilder storageKey="ricos-computer-circuits-embed-test" />
          </LazyMount>
        </section>
        <ComputerDemoNav current="builders-on-one-page" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
