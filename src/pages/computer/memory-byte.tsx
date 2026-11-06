import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { MemoryByteDemo } from "@components/computer/MemoryDemos";

export default function MemoryBytePage() {
  return (
    <DeviceDemoPage slug="memory-byte" description="Write a byte into eight cells and read it out.">
      <MemoryByteDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
