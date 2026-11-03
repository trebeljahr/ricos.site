import { BlitterDemo } from "@components/computer/BlitterDemo";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function BlitterPage() {
  return (
    <DeviceDemoPage
      slug="blitter"
      description="The blitter takes a position and a command from the CPU, then draws one row or pixel per clock tick by itself."
    >
      <BlitterDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
