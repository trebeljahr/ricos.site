import { Consonance } from "@components/piano/Consonance";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function ConsonancePage() {
  return (
    <PianoDemoPage
      slug="consonance"
      samples={false}
      description="Drag one note over an octave and see where the harmonics of two notes rub or line up."
    >
      <Consonance />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
