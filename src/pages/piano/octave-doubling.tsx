import { OctaveDoubling } from "@components/piano/OctaveDoubling";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function OctaveDoublingPage() {
  return (
    <PianoDemoPage
      slug="octave-doubling"
      description="Slide one tone up to twice the frequency of another and see where both land on a pitch spiral."
    >
      <OctaveDoubling />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
