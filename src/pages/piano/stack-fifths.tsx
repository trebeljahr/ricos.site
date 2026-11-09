import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";
import { StackFifths } from "@components/piano/StackFifths";

export default function StackFifthsPage() {
  return (
    <PianoDemoPage
      slug="stack-fifths"
      description="Stack twelve fifths, fold them into one octave, and see where the piano's twelve keys come from."
    >
      <StackFifths />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
