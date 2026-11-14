import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";
import { PluckString } from "@components/piano/PluckString";

export default function PluckAStringPage() {
  return (
    <PianoDemoPage
      slug="pluck-a-string"
      samples={false}
      description="Change a string's length and tension, pluck it, and see the standing waves it vibrates in."
    >
      <PluckString />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
