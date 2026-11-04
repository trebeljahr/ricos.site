import { EightBitAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function EightBitAdderPage() {
  return (
    <DeviceDemoPage
      slug="eight-bit-adder"
      description="Eight full adders in a row that add two bytes."
    >
      <EightBitAdder />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
