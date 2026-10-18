import dynamic from "next/dynamic";
import Link from "next/link";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import Layout from "@components/Layout";
import { rawSegmentDemo } from "../../lib/computer/sevenSegment";
const LogicBuilder = dynamic(
  () => import("@components/computer/LogicBuilder").then((m) => m.LogicBuilder),
  { ssr: false },
);
const initial = rawSegmentDemo();
export default function SevenSegmentPage() {
  return (
    <Layout
      title="Seven-segment decimal displays"
      description="Wire each bar, decode BCD, then build decimal displays with one to four digits."
      keywords={[]}
      url="computer/seven-segment"
      noindex
    >
      <ComputerDemoNav current="seven-segment" />
      <h1>Wire a decimal display</h1>
      <p>
        Start with the seven switches. Each letter lights one bar. The display palette opens a BCD
        decoder demo and decimal demos with one to four digits. Open each converter to trace its
        gates.
      </p>
      <p>
        BCD uses 0–9; 10–15 blanks. Decimal displays keep leading zeroes. On overflow, the low
        digits remain and OVERFLOW lights. Eight bits reach 255; fourteen bits reach 16383.
      </p>
      <p>
        <Link href="/computer/build-from-nand?level=raw-seven-segment">
          Build and check these circuits yourself →
        </Link>
      </p>
      <div className="not-prose h-[85svh] min-h-[650px]">
        <LogicBuilder storageKey={null} initialCircuit={initial} />
      </div>
      <ComputerDemoNav current="seven-segment" bottom />
    </Layout>
  );
}
export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
