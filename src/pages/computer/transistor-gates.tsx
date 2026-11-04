import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { TransistorGates } from "@components/computer/TransistorGates";
import Link from "next/link";

export default function TransistorGatesPage() {
  return (
    <DeviceDemoPage slug="transistor-gates" description="Gates wired from transistors.">
      <p>
        <Link href="/computer/build-from-nand?level=cmos-not">Wire a transistor inverter →</Link>
      </p>
      <TransistorGates />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
