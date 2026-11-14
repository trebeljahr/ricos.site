import { ActionDemo } from "@components/piano/ActionDemo";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function LetTheHammerFlyPage() {
  return (
    <PianoDemoPage
      slug="let-the-hammer-fly"
      samples={false}
      description="A jack that slips out from under the hammer, so the hammer flies the last bit on its own."
    >
      <ActionDemo stage="escapement" />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
