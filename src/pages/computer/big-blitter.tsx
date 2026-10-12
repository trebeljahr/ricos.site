import { BigBlitterDemo } from "@components/computer/BigBlitterDemo";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function BigBlitterPage() {
  return (
    <DeviceDemoPage
      slug="big-blitter"
      description="The big blitter fills a rectangle of the 32×32 screen with one byte, or copies a rectangle to another place, one byte per clock tick."
      intro="The big blitter sits at data addresses DC to DF. FILL writes one byte value into a rectangle of the 32×32 screen, and COPY copies a rectangle to another place. Set DST, SRC and SIZE, start the command and step the clock: one byte per tick."
    >
      <BigBlitterDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
