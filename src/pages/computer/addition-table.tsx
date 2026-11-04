import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { AdditionTable } from "@components/computer/TruthTables";

export default function AdditionTablePage() {
  return (
    <DeviceDemoPage slug="addition-table" description="Every sum of two bits.">
      <AdditionTable />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
