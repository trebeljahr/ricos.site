import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { MemoryCellDemo } from "@components/computer/MemoryDemos";

export default function MemoryCellPage() {
  return (
    <DeviceDemoPage slug="memory-cell" description="Write and read one addressable memory cell.">
      <MemoryCellDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
