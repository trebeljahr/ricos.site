import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";
import { PluckString } from "@components/piano/PluckString";

export default function PluckAStringPage() {
  return (
    <PianoDemoPage
      slug="pluck-a-string"
      samples={false}
      description="Pull a string, let go, and watch and hear it vibrate at any frequency you can hear."
    >
      <PluckString />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
