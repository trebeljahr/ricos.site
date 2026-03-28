import { MDXRemote } from "next-mdx-remote";
import { MDXResult } from "src/@types";
import { MarkdownRenderers } from "./MarkdownRenderers";

interface MDXProps {
  source: MDXResult;
}

export const MDXContent = ({ source }: MDXProps) => {
  return (
    <MDXRemote
      {...source}
      components={MarkdownRenderers}
      lazy
    />
  );
};
