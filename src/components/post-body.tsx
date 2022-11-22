import React from "react";
import ReactMarkdown from "react-markdown";
import remarkToc from "remark-toc";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { MarkdownRenderers } from "./CustomRenderers";

type Props = {
  content: string;
  excerpt?: string;
};

const PostBody = ({ content, excerpt }: Props) => {
  return (
    <div className="main-text">
      {excerpt && <p>{excerpt}</p>}
      <ReactMarkdown
        remarkPlugins={[remarkToc, remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={MarkdownRenderers}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default PostBody;
