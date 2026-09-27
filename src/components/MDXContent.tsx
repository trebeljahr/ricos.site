import type { MDXComponents } from "mdx/types";
import { getMDXComponent } from "mdx-bundler/client";
import { useMemo } from "react";
import type { MDXResult } from "src/@types";
import { MarkdownRenderers } from "./MarkdownRenderers";

interface MDXProps {
  source: MDXResult;
  /**
   * Renderers for one page, laid over the shared ones. Only the blocks a page
   * hangs something off: the whole MDXComponents type carries R3F's JSX
   * elements, whose never-typed props no spread of it can satisfy.
   */
  components?: Pick<MDXComponents, "h2" | "h3" | "p">;
}

export const MDXContent = ({ source, components }: MDXProps) => {
  const Component = useMemo(() => getMDXComponent(source.code), [source.code]);
  return <Component components={{ ...MarkdownRenderers, ...components }} />;
};
