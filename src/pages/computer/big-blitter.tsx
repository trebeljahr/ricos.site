import { BigBlitterDemo } from "@components/computer/BigBlitterDemo";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function BigBlitterPage() {
  return (
    <DeviceDemoPage
      slug="big-blitter"
      description="The big blitter fills a rectangle of the 32×32 screen with one byte, or copies a rectangle to another place, one byte per clock tick."
    >
      <BigBlitterDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
