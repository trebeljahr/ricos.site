import { BlitterDemo } from "@components/computer/BlitterDemo";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function BlitterPage() {
  return (
    <DeviceDemoPage
      slug="blitter"
      description="The blitter takes a position and a command from the CPU, then draws one row or pixel per clock tick by itself."
      intro="The blitter sits at data addresses E0 to E4. The CPU stores a position and a command there. The blitter then draws by itself, one row or one pixel per clock tick, and the CPU runs on. Set the registers, start a command and step the clock."
    >
      <BlitterDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
