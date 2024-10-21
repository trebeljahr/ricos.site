import { Newsletter } from "@velite";
import { MDXContent } from "./MDXContent";
import { UnitVectorDemo } from "./collisionDetection/UnitVectorDemo";
import { ThreeFiberDemo } from "./Demo";

type Props = {
  content: Newsletter["content"];
};

export const PostBodyWithoutExcerpt = ({ content }: Props) => {
  return (
    <div>
      <MDXContent
        code={content}
        components={{ UnitVectorDemo, ThreeFiberDemo }}
      />
    </div>
  );
};
