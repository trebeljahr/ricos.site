import { HalfAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function HalfAdderPage() {
  return (
    <DeviceDemoPage slug="half-adder" description="A half adder built from gates.">
      <HalfAdder />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
