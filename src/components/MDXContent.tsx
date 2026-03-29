import { getMDXComponent } from "mdx-bundler/client";
import { useMemo } from "react";
import { MDXResult } from "src/@types";
import { MarkdownRenderers } from "./MarkdownRenderers";

interface MDXProps {
  source: MDXResult;
}

export const MDXContent = ({ source }: MDXProps) => {
  const Component = useMemo(() => getMDXComponent(source.code), [source.code]);
  return <Component components={MarkdownRenderers} />;
};
