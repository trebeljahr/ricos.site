import { Overtones } from "@components/piano/Overtones";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function OvertonesPage() {
  return (
    <PianoDemoPage
      slug="overtones"
      samples={false}
      description="Add harmonics up into one wave, or draw a wave and see which harmonics it holds."
    >
      <Overtones />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
