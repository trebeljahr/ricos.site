import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const LogicTutorial = dynamic(
  () =>
    import("@components/computer/tutorial/LogicTutorial").then((module) => module.LogicTutorial),
  { ssr: false, loading: () => <p className="p-stack">Loading the builder…</p> },
);

export default function BuildFromNandPage() {
  const router = useRouter();
  const level = typeof router.query.level === "string" ? router.query.level : undefined;
  return (
    <Layout
      title="Build a computer from NAND"
      description="Wire every part of a computer yourself, from one NAND gate up through adders, an ALU and memory. Each level checks your circuit against its truth table."
      keywords={[]}
      url="computer/build-from-nand"
      noindex
    >
      <PageMain>
        <ComputerDemoNav current="build-from-nand" />
        <Header
          title="Build a computer from NAND"
          subtitle="Each level asks for one part and gives you the parts you built before. Check your wiring against the truth table, then use your own part in the next level."
        />
        {/* Full bleed: the builder needs the room of the whole window. */}
        <div className="not-prose mt-para ml-[calc(50%-50vw+0.75rem)] h-[88svh] min-h-[620px] w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl">
          {router.isReady && (
            <LogicTutorial
              level={level}
              sequential
              onLevelChange={(id) =>
                router.replace({ query: { level: id } }, undefined, {
                  shallow: true,
                  scroll: false,
                })
              }
            />
          )}
        </div>
        <ComputerDemoNav current="build-from-nand" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
