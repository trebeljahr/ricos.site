import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { CPU_LEVEL_SPECS } from "../../lib/computer/cpuLevels";

const CpuChallenge = dynamic(
  () => import("@components/computer/CpuChallenge").then((module) => module.CpuChallenge),
  { ssr: false, loading: () => <p className="p-stack">Loading the builder…</p> },
);

export default function BuildACpuPage() {
  const router = useRouter();
  const requested = Number(router.query.level);
  const level =
    Number.isInteger(requested) && requested >= 1 && requested <= CPU_LEVEL_SPECS.length
      ? requested
      : 1;
  return (
    <Layout
      title="Build your own CPU"
      description="Wire the toy CPU's buses and control lines level by level, and check each level against the program stepper."
      keywords={[]}
      url="computer/build-a-cpu"
      noindex
    >
      <PageMain>
        <ComputerDemoNav current="build-a-cpu" />
        <Header
          title="Build your own CPU"
          subtitle="Six levels, from fetching one instruction to calling functions. Each check runs your circuit next to the program stepper and stops at the first tick where they differ."
        />
        {/* Full bleed: the CPU is wider than the page column. */}
        <div className="not-prose mt-para ml-[calc(50%-50vw+0.75rem)] h-[88svh] min-h-[620px] w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl">
          {router.isReady && (
            <CpuChallenge
              level={level}
              onLevelChange={(next) =>
                router.replace({ query: { level: next } }, undefined, {
                  shallow: true,
                  scroll: false,
                })
              }
            />
          )}
        </div>
        <ComputerDemoNav current="build-a-cpu" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
