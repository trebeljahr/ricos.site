import { FourBitAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function FourBitAdderPage() {
  return (
    <DeviceDemoPage
      slug="four-bit-adder"
      description="Four full adders in a column that add two 4-bit numbers."
      wide
    >
      <FourBitAdder />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
