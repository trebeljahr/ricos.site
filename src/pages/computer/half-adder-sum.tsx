import { HalfAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function HalfAdderSumPage() {
  return (
    <DeviceDemoPage slug="half-adder-sum" description="The sum output of a half adder.">
      <HalfAdder sumOnly />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
