import { CircleOfFifths } from "@components/piano/CircleOfFifths";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function CircleOfFifthsPage() {
  return (
    <PianoDemoPage
      slug="circle-of-fifths"
      description="Turn a circle of fifths and watch the key signature and the keyboard follow."
    >
      <CircleOfFifths />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
