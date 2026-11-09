import { Overtones } from "@components/piano/Overtones";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function OvertonesPage() {
  return (
    <PianoDemoPage
      slug="overtones"
      samples={false}
      description="Turn the harmonics of one note up and down, and hear and see what each one adds."
    >
      <Overtones />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
