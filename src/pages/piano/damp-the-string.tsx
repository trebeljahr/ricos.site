import { ActionDemo } from "@components/piano/ActionDemo";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function DampTheStringPage() {
  return (
    <PianoDemoPage
      slug="damp-the-string"
      samples={false}
      description="A damper that lifts with the key and falls back on the string when it comes up."
    >
      <ActionDemo stage="damper" />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
