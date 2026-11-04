import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNorNandPage() {
  return (
    <DeviceDemoPage wide slug="universal-nor-nand" description="Build NAND using only NOR gates.">
      <LazyLogicTutorial
        title="NAND from NOR"
        levels={["universal-nor-nand"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
