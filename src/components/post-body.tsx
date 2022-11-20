import React from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import Image from "next/image";
import remarkToc from "remark-toc";
import rehypeRaw from "rehype-raw";
import { ExternalLink } from "./ExternalLink";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type Props = {
  content: string;
  excerpt?: string;
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

const ImageRenderer = (props: { children?: any; node?: any }) => {
  const { node } = props;
  const image = node;
  const metastring = image.properties.alt;

  const alt = metastring?.replace(/ *\/[^)]*\/ */g, "");

  const width = metastring?.match(/\/width: (.*?)\//)?.pop() || 1;
  const height = metastring?.match(/\/height: (.*?)\//)?.pop() || 1;

  const isPriority = metastring?.toLowerCase().match("{priority}");
  const hasCaption = metastring?.toLowerCase().includes("{caption:");
  const caption = metastring?.match(/{caption: (.*?)}/)?.pop();

  return (
    <>
      <span className="postImgWrapper">
        <Image
          src={image.properties.src}
          layout="responsive"
          objectFit="cover"
          alt={alt}
          priority={isPriority}
          width={width}
          height={height}
          // placeholder="blur"
        />
      </span>
      {hasCaption ? (
        <div className="caption" aria-label={caption}>
          {caption}
        </div>
      ) : null}
    </>
  );
};

const ParagraphRenderer = (props: { children?: JSX.Element[]; node?: any }) => {
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

const MarkdownRenderers: object = {
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
