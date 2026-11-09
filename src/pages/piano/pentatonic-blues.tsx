import { PentatonicBlues } from "@components/piano/PentatonicBlues";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function PentatonicBluesPage() {
  return (
    <PianoDemoPage
      slug="pentatonic-blues"
      description="The pentatonic inside a major scale, the relative minor, and the blue note."
    >
      <PentatonicBlues />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
