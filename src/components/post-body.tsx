import React from "react";
import Link from "next/link";
import Image from "next/image";

import { ExternalLink } from "./ExternalLink";

import { MDXProvider } from "@mdx-js/react";

type Props = {
  content: MDXRemoteSerializeResult<Record<string, unknown>>;
};

type HeadingResolverProps = {
  level: number;
  children: JSX.Element[];
};

const HeadingRenderer: React.FC<HeadingResolverProps> = ({
  level,
  children,
}) => {
  const heading = children[0]?.props?.value || children[0];

  let anchor = (typeof heading === "string" ? heading.toLowerCase() : "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/ /g, "-");

  switch (level) {
    case 1:
      return <h1 id={anchor}>{children}</h1>;
    case 2:
      return <h2 id={anchor}>{children}</h2>;
    case 3:
      return <h3 id={anchor}>{children}</h3>;
    case 4:
      return <h4 id={anchor}>{children}</h4>;
    case 5:
      return <h5 id={anchor}>{children}</h5>;
    default:
      return <h6 id={anchor}>{children}</h6>;
  }
};

const ImageRenderer = (props: any) => {
  return (
    <>
      <span className="postImgWrapper">
        <Image alt={props.alt} layout="fill" objectFit="cover" {...props} />
      </span>
    </>
  );
};

const ParagraphRenderer = (props: { children?: JSX.Element[] }) => {
  const className =
    props.children?.length &&
    (props.children[0] as unknown as string)[0] === "—"
      ? "quote-author"
      : "paragraph";

  return <p className={className}>{props.children}</p>;
};

const LinkRenderer = (props: any) => {
  const href = props.href;
  const isInternalLink = href && (href.startsWith("/") || href.startsWith("#"));

  if (isInternalLink) {
    return (
      <Link href={href || ""}>
        <a className="internalLink" {...props} />
      </Link>
    );
  }

  return <ExternalLink {...props} />;
};

const MarkdownRenderers: any = {
  h1: HeadingRenderer,
  h2: HeadingRenderer,
  h3: HeadingRenderer,
  h4: HeadingRenderer,
  h5: HeadingRenderer,
  h6: HeadingRenderer,
  p: ParagraphRenderer,
  a: LinkRenderer,
  img: ImageRenderer,
};

import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";

const PostBody = ({ content }: Props) => {
  return (
    <div className="main-text">
      <MDXRemote {...content} components={MarkdownRenderers} />
      {/* <MDXProvider components={MarkdownRenderers}>{content}</MDXProvider> */}
    </div>
  );
};

export default PostBody;
