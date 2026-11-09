import { ChordBuilder } from "@components/piano/ChordBuilder";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ChordBuilderPage() {
  return (
    <PianoDemoPage
      slug="chord-builder"
      description="Build a chord by stacking major and minor thirds on any root, up to a thirteenth."
    >
      <ChordBuilder />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
