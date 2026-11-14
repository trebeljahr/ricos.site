import { ClavichordTangent } from "@components/piano/ClavichordTangent";
import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";

export default function PressATangentPage() {
  return (
    <PianoDemoPage
      slug="press-a-tangent"
      samples={false}
      description="A clavichord tangent strikes the string and stays on it while the key is down."
    >
      <ClavichordTangent />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
