import { ChordInversions } from "@components/piano/ChordInversions";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ChordInversionsPage() {
  return (
    <PianoDemoPage
      slug="chord-inversions"
      description="Stack thirds into a chord, then move its notes into inversions and wider voicings."
    >
      <ChordInversions />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
