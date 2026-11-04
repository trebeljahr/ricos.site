import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { TransistorGates } from "@components/computer/TransistorGates";

export default function TransistorGatesNandPage() {
  return (
    <DeviceDemoPage slug="transistor-gates-nand" description="A NAND gate wired from transistors.">
      <TransistorGates gate="nand" fixed />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
