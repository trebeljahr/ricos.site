import { AluBitSlice } from "@components/computer/AluDemos";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function AluBitSlicePage() {
  return (
    <DeviceDemoPage
      slug="alu-bit-slice"
      description="One bit of an ALU: a logic unit, a full adder and a selector."
      wide
    >
      <AluBitSlice />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
