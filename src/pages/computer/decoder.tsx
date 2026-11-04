import { DecoderDemo } from "@components/computer/AddressRouting";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function DecoderPage() {
  return (
    <DeviceDemoPage slug="decoder" description="Decode an address into one selected line.">
      <DecoderDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
