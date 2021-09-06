import { useEffect } from "react";
import Prism from "prismjs";
import "prismjs/plugins/toolbar/prism-toolbar";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard";

type Props = {
  content: string;
};

const PostBody = ({ content }: Props) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("Running Prism Highlight Function");
      setTimeout(Prism.highlightAll, 1000);
    }
  }, [content]);

  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: content }} />
  );
};

export default PostBody;
