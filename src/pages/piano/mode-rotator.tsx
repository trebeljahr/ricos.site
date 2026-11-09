import { ModeRotator } from "@components/piano/ModeRotator";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ModeRotatorPage() {
  return (
    <PianoDemoPage
      slug="mode-rotator"
      description="The seven modes on one tonic, from brightest to darkest, one changed note at a time."
    >
      <ModeRotator />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
