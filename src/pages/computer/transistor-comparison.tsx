import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { TransistorComparison } from "@components/computer/SwitchLogic";

export default function TransistorComparisonPage() {
  return (
    <DeviceDemoPage
      slug="transistor-comparison"
      description="Compare a PMOS and an NMOS transistor."
    >
      <TransistorComparison />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
