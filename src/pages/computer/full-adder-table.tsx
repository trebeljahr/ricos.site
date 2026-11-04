import { FullAdderTable } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function FullAdderTablePage() {
  return (
    <DeviceDemoPage slug="full-adder-table" description="Every sum of two bits and a carry.">
      <FullAdderTable />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
