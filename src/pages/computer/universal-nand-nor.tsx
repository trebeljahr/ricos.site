import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNandNorPage() {
  return (
    <DeviceDemoPage wide slug="universal-nand-nor" description="Build NOR using only NAND gates.">
      <LazyLogicTutorial
        title="NOR from NAND"
        levels={["universal-nand-nor"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
