import { OctaveDoubling } from "@components/piano/OctaveDoubling";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function OctaveDoublingPage() {
  return (
    <PianoDemoPage
      slug="octave-doubling"
      samples={false}
      description="Slide one tone up to twice the frequency of another: the sum stops moving, and both land on the same spoke of a pitch spiral."
    >
      <OctaveDoubling />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
