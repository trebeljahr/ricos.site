import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { GateTruthTable } from "@components/computer/TruthTables";

export default function GateTruthTablePage() {
  return (
    <DeviceDemoPage slug="gate-truth-table" description="The truth table of each logic gate.">
      <GateTruthTable />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
