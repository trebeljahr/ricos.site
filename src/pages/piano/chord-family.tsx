import { ChordFamily } from "@components/piano/ChordFamily";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ChordFamilyPage() {
  return (
    <PianoDemoPage
      slug="chord-family"
      description="Build the triad on each note of a scale by counting half steps up from its root."
    >
      <ChordFamily />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
