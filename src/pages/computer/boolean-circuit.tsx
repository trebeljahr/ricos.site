import { BooleanCircuitDemo } from "@components/computer/BooleanCircuitDemo";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function BooleanCircuitPage() {
  return (
    <DeviceDemoPage
      slug="boolean-circuit"
      description="A boolean expression and the circuit that matches it."
    >
      <BooleanCircuitDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
