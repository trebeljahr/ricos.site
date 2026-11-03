import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { VramPortDemo } from "@components/computer/VramPortDemo";

export default function VramPortPage() {
  return (
    <DeviceDemoPage
      slug="vram-port"
      description="Three addresses reach all 128 bytes of the 32×32 screen: each store to DATA writes one byte and moves ADDR on."
    >
      <VramPortDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
