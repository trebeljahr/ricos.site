import { ActionDemo } from "@components/piano/ActionDemo";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function FixTheHammerPage() {
  return (
    <PianoDemoPage
      slug="fix-the-hammer"
      samples={false}
      description="A hammer pushed by the key, with nothing to let it go."
    >
      <ActionDemo stage="fixed" />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
