import { ActionDemo } from "@components/piano/ActionDemo";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function CatchTheHammerPage() {
  return (
    <PianoDemoPage
      slug="catch-the-hammer"
      samples={false}
      description="A backcheck that catches the falling hammer while the key is down."
    >
      <ActionDemo stage="check" />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
