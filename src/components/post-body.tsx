import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "./ExternalLink";

type Props = {
  content: string;
};

type HeadingResolverProps = {
  level: number;
  children: JSX.Element[];
};

type ChildrenProps = { children: JSX.Element[] };

function getAnchor(children: JSX.Element[]) {
  const heading = children[0]?.props?.value || children[0];
  let anchor = (typeof heading === "string" ? heading.toLowerCase() : "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/ /g, "-");
  return anchor;
}

function h1({ children }: ChildrenProps) {
  return <h1 id={getAnchor(children)}>{children}</h1>;
}
function h2({ children }: ChildrenProps) {
  return <h2 id={getAnchor(children)}>{children}</h2>;
}
function h3({ children }: ChildrenProps) {
  return <h3 id={getAnchor(children)}>{children}</h3>;
}
function h4({ children }: ChildrenProps) {
  return <h4 id={getAnchor(children)}>{children}</h4>;
}
function h5({ children }: ChildrenProps) {
  return <h5 id={getAnchor(children)}>{children}</h5>;
}
function h6({ children }: ChildrenProps) {
  return <h6 id={getAnchor(children)}>{children}</h6>;
}

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
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p: ParagraphRenderer,
  a: LinkRenderer,
  img: ImageRenderer,
};

import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";

const PostBody = ({ content }: Props) => {
  return (
    <div className="main-text">
      <MDXRemote compiledSource={content} components={MarkdownRenderers} />
    </div>
  );
};

export default PostBody;
