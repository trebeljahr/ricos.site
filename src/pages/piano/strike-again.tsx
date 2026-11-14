import { ActionDemo } from "@components/piano/ActionDemo";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function StrikeAgainPage() {
  return (
    <PianoDemoPage
      slug="strike-again"
      samples={false}
      description="A repetition lever that lets the hammer strike again with the key only part way up."
    >
      <ActionDemo stage="repetition" />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
