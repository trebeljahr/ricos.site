import { ImageWithLoader } from "@components/ImageWithLoader";
import Link from "next/link";
import { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from "react";
import { ThreeFiberDemo } from "./Demo";
import { ExternalLink } from "./ExternalLink";
import { ImageGallery, SimpleGallery } from "./NiceGallery";

export const ImageRenderer = ({
  src,
  alt,
}: ImgHTMLAttributes<HTMLImageElement>) => {
  if (!src) return null;

  const realAlt = alt ? alt?.replace(/ *\/[^)]*\/ */g, "") : src;

  const width = alt?.match(/\/width: (.*?)\//)?.pop() || "1";
  const height = alt?.match(/\/height: (.*?)\//)?.pop() || "1";

  const isPriority = alt?.toLowerCase().match("{priority}");
  const hasCaption = alt?.toLowerCase().includes("{caption:");
  const caption = alt?.match(/{caption: (.*?)}/)?.pop();

  return (
    <>
      <span className="postImgWrapper markdown-image">
        <ImageWithLoader
          src={src}
          alt={realAlt}
          priority={!!isPriority}
          width={parseFloat(width)}
          height={parseFloat(height)}
          sizes="100vw"
          style={{
            width: "100%",
            height: "auto",
            objectFit: "cover",
          }}
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

export const LinkRenderer = ({
  href,
  children,
}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  if (!href) return null;

  const isInternalLink = href.startsWith("/") || href.startsWith("#");

  if (isInternalLink) {
    return <Link href={href}>{children}</Link>;
  }
  return <ExternalLink href={href}>{children}</ExternalLink>;
};

export const ParagraphRenderer = ({
  children,
}: HTMLAttributes<HTMLParagraphElement>) => {
  if (typeof children === "string" && children.startsWith("–")) {
    return <p className="quote-author">{children}</p>;
  }

  return <p>{children}</p>;
};

export const HeadingRenderer = (level: number) => {
  return function Heading({ children }: HTMLAttributes<HTMLHeadingElement>) {
    if (typeof children !== "string") return null;
    let anchor = children
      .toLowerCase()
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
};

export const CodeRenderer = (props: HTMLAttributes<HTMLPreElement>) => {
  return (
    <pre className="not-prose" {...props}>
      {props.children}
    </pre>
  );
};

const handleNiceImageGalleries = (props: { images: string }) => {
  console.log("handle nice image gallery", props);
  const photos = JSON.parse(props.images);

  return <SimpleGallery photos={photos} />;
};

const handleDivs = (props: any) => {
  console.log("handle divs", props);
  return <div {...props} />;
};

export const MarkdownRenderers = {
  p: ParagraphRenderer,
  a: LinkRenderer,
  img: ImageRenderer,
  pre: CodeRenderer,
  div: handleDivs,
  SimpleGallery: handleNiceImageGalleries,
  ThreeFiberDemo: ThreeFiberDemo,
  // NiceImageGallery: handleNiceImageGalleries,
  Test: () => <div>Test</div>,
};
