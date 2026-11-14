import { ActionDemo } from "@components/piano/ActionDemo";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function UprightActionPage() {
  return (
    <PianoDemoPage
      slug="upright-action"
      samples={false}
      description="The upright piano action, with the hammer swinging into a standing string."
    >
      <ActionDemo stage="upright" />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
