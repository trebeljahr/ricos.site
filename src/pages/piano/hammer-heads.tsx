import { HammerHeads } from "@components/piano/HammerHeads";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function HammerHeadsPage() {
  return (
    <PianoDemoPage
      slug="hammer-heads"
      samples={false}
      description="Bare wood, leather and felt hammers: how long each stays on the string and what you hear."
    >
      <HammerHeads />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
