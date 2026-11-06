import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";
import { TRANSISTOR_GATE_LESSONS } from "src/lib/computer/cmosGates";
import { SINGLE_TASK_BUILDER } from "src/lib/computer/tutorial/types";

export default function TransistorGateBuilderPage() {
  return (
    <DeviceDemoPage
      slug="transistor-gate-builder"
      description="Wire every logic gate from transistors."
      wide
    >
      <LazyLogicTutorial
        title="Build gates from transistors"
        levels={TRANSISTOR_GATE_LESSONS}
        features={SINGLE_TASK_BUILDER}
      />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
