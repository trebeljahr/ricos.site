import React from "react";
import ReactMarkdown from "react-markdown";
import remarkToc from "remark-toc";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { MarkdownRenderers } from "./CustomRenderers";

type Props = {
  content: string;
};

export const PostBodyWithoutExcerpt = ({ content }: Props) => {
  return (
    <div>
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
