import { MemoryAddressDemo } from "@components/computer/AddressRouting";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function MemoryAddressPage() {
  return (
    <DeviceDemoPage slug="memory-address" description="Address, read and write one memory cell.">
      <MemoryAddressDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
