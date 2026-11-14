import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";
import { QuillJack } from "@components/piano/QuillJack";

export default function PluckWithAQuillPage() {
  return (
    <PianoDemoPage
      slug="pluck-with-a-quill"
      samples={false}
      description="A harpsichord key lifts a jack whose quill plucks the string, then slips back past it."
    >
      <QuillJack />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
