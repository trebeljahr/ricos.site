import { ChordFamily } from "@components/piano/ChordFamily";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ChordFamilyPage() {
  return (
    <PianoDemoPage
      slug="chord-family"
      description="Try a major, minor and diminished triad on each note of a scale and keep the one that fits."
    >
      <ChordFamily />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
