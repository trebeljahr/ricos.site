import { HalfAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function HalfAdderPage() {
  return (
    <DeviceDemoPage
      slug="half-adder"
      description="XOR and AND add two bits and give a sum and a carry."
    >
      <HalfAdder />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
