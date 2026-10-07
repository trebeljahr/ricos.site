import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { CpuChallenge } from "@components/computer/CpuChallenge";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import { useRouter } from "next/router";
import { CPU_LEVEL_SPECS } from "../../lib/computer/cpuLevels";

export default function BuildACpuPage() {
  const { query } = useRouter();
  const requested = Number(query.level);
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
        <CpuChallenge level={level} />
        <ComputerDemoNav current="build-a-cpu" bottom />
      </PageMain>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
