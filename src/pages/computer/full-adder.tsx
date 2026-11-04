import { FullAdder } from "@components/computer/Adders";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function FullAdderPage() {
  return (
    <DeviceDemoPage slug="full-adder" description="A full adder built from gates.">
      <FullAdder />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
