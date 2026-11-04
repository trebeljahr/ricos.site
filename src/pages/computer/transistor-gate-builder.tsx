import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";

export default function TransistorGateBuilderPage() {
  return (
    <DeviceDemoPage
      slug="transistor-gate-builder"
      description="Wire a NOT and a NAND gate from transistors."
    >
      <LazyLogicTutorial title="Build gates from transistors" levels={["cmos-not", "cmos-nand"]} />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
