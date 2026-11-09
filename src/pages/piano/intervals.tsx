import { Intervals } from "@components/piano/Intervals";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function IntervalsPage() {
  return (
    <PianoDemoPage
      slug="intervals"
      description="Pick a key and an interval, and hear and count the distance between the two notes."
    >
      <Intervals />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
