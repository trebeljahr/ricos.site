import { ActionDemo } from "@components/piano/ActionDemo";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function GrandActionPage() {
  return (
    <PianoDemoPage
      slug="grand-action"
      samples={false}
      description="The whole grand piano action, part by part."
    >
      <ActionDemo stage="grand" />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
