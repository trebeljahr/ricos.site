import { ChordPad } from "@components/piano/ChordPad";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ChordPadPage() {
  return (
    <PianoDemoPage
      slug="chord-pad"
      description="The seven chords of any key as pads, coloured by function, with smooth voice leading."
    >
      <ChordPad />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
