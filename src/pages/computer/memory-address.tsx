import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { MemoryAddressDemo } from "@components/computer/MemoryDemos";

export default function MemoryAddressPage() {
  return (
    <DeviceDemoPage
      slug="memory-address"
      description="Address four bytes of RAM on one data bus and copy a byte from one to another."
    >
      <MemoryAddressDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
