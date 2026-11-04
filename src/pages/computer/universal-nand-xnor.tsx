import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function UniversalNandXnorPage() {
  return (
    <DeviceDemoPage slug="universal-nand-xnor" description="Build XNOR using only NAND gates.">
      <LazyLogicTutorial
        title="XNOR from NAND"
        levels={["universal-nand-xnor"]}
        height="min(88svh, 880px)"
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
