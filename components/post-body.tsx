import React, { useEffect } from "react";
import Prism from "prismjs";
import "prismjs/plugins/toolbar/prism-toolbar";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import Image from "next/image";
import remarkToc from "remark-toc";
import rehypeRaw from "rehype-raw";
import { ExternalLink } from "./ExternalLink";

type Props = {
  content: string;
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

const ParagraphRenderer = (paragraph: {
  children?: JSX.Element[];
  node?: any;
}) => {
  const { node } = paragraph;

  if (node.children[0].tagName === "img") {
    const image = node.children[0];
    const metastring = image.properties.alt;
    const alt = metastring?.replace(/ *\{[^)]*\} */g, "");
    const metaWidth = metastring.match(/{([^}]+)x/);
    const metaHeight = metastring.match(/x([^}]+)}/);
    const width = metaWidth ? metaWidth[1] : "768";
    const height = metaHeight ? metaHeight[1] : "432";
    const isPriority = metastring?.toLowerCase().match("{priority}");
    const hasCaption = metastring?.toLowerCase().includes("{caption:");
    const caption = metastring?.match(/{caption: (.*?)}/)?.pop();

    return (
      <div className="postImgWrapper">
        <Image
          src={image.properties.src}
          layout="responsive"
          width={width}
          height={height}
          className="postImg"
          alt={alt}
          priority={isPriority}
        />
        {hasCaption ? (
          <div className="caption" aria-label={caption}>
            {caption}
          </div>
        ) : null}
      </div>
    );
  }

  const className =
    paragraph.children?.length &&
    (paragraph.children[0] as unknown as string)[0] === "—"
      ? "quote-author"
      : "";

  return <p className={className}>{paragraph.children}</p>;
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
};

const PostBody = ({ content }: Props) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(Prism.highlightAll, 1000);
    }
  }, [content]);

  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkToc]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownRenderers}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default PostBody;
