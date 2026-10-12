import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { PixelPortDemo } from "@components/computer/PixelPortDemo";

export default function PixelPortPage() {
  return (
    <DeviceDemoPage
      slug="pixel-port"
      description="A store to a screen row replaces all 8 of its pixels. The pixel port at F8 to FA changes one pixel and keeps the rest."
      intro="A store to a screen row replaces all 8 of its pixels. The pixel port at F8 to FA changes one: store x in F8, y in F9, then the colour in FA. Click a pixel to move the cursor there, then store a colour."
    >
      <PixelPortDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
