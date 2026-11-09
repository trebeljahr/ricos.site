import { Consonance } from "@components/piano/Consonance";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ConsonancePage() {
  return (
    <PianoDemoPage
      slug="consonance"
      samples={false}
      description="Drag along a curve of how rough two tones sound together, for every interval up to an octave."
    >
      <Consonance />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
