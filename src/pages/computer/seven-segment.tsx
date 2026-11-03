import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import dynamic from "next/dynamic";
import Link from "next/link";
import { layoutCircuit } from "src/lib/computer/circuitLayout";
import { demoStorageKey } from "src/lib/computer/demoStorage";
import { rawSegmentDemo } from "src/lib/computer/sevenSegment";

const LogicBuilder = dynamic(
  () => import("@components/computer/LogicBuilder").then((m) => m.LogicBuilder),
  { ssr: false },
);
const initial = layoutCircuit(rawSegmentDemo());

export default function SevenSegmentPage() {
  return (
    <DeviceDemoPage
      slug="seven-segment"
      description="Wire each bar, decode BCD, then build decimal displays with one to four digits."
    >
      <p>
        <Link href="/computer/build-from-nand?level=raw-seven-segment">
          Build and check these circuits yourself →
        </Link>
      </p>
      <div className="not-prose h-[85svh] min-h-[650px]">
        <LogicBuilder storageKey={demoStorageKey("seven-segment")} initialCircuit={initial} />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
