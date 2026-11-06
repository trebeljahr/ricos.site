import { Alu74181Schematic } from "@components/computer/Alu74181Schematic";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function Alu74181Page() {
  return (
    <DeviceDemoPage slug="alu-74181" description="The gates of the 74181, a real 4-bit ALU chip.">
      <Alu74181Schematic />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
