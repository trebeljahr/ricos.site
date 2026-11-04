import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { TransistorSwitches } from "@components/computer/SwitchLogic";

export default function TransistorSwitchesPage() {
  return (
    <DeviceDemoPage
      slug="transistor-switches"
      description="Control the same switch paths with transistors."
    >
      <TransistorSwitches />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
