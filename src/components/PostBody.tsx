import { type Newsletter } from "@velite";
import { MDXContent } from "./MDXContent";

type Props = {
  content: Newsletter["content"];
};

export const PostBodyWithoutExcerpt = ({ content }: Props) => {
  return <MDXContent source={content} />;
};
