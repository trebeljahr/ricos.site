import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { VramPortDemo } from "@components/computer/VramPortDemo";

export default function VramPortPage() {
  return (
    <DeviceDemoPage
      slug="vram-port"
      description="Three addresses reach all 128 bytes of the 32×32 screen: each store to DATA writes one byte and moves ADDR on."
      intro="The 32×32 screen has 128 bytes. A port of three addresses reaches them one after another: ADDR at D9, DATA at DA and STEP at DB. Click a byte to point ADDR at it, then store to DATA and watch ADDR move on."
    >
      <VramPortDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
