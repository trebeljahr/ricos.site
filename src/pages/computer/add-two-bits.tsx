import { HalfAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function AddTwoBitsPage() {
  return (
    <DeviceDemoPage slug="add-two-bits" description="An XOR gate adds two bits, without a carry.">
      <HalfAdder sumOnly />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
