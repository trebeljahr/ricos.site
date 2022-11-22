import Image from "next/image";
import Link from "next/link";
import { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from "react";
import { ExternalLink } from "./ExternalLink";

export const ImageRenderer = ({
  src,
  alt,
}: ImgHTMLAttributes<HTMLImageElement>) => {
  if (!src || !alt) return null;

  const realAlt = alt?.replace(/ *\/[^)]*\/ */g, "");

  const width = alt?.match(/\/width: (.*?)\//)?.pop() || "1";
  const height = alt?.match(/\/height: (.*?)\//)?.pop() || "1";

  const isPriority = alt?.toLowerCase().match("{priority}");
  const hasCaption = alt?.toLowerCase().includes("{caption:");
  const caption = alt?.match(/{caption: (.*?)}/)?.pop();

  return (
    <>
      <span className="postImgWrapper markdown-image">
        <Image
          src={src}
          layout="responsive"
          objectFit="cover"
          alt={realAlt}
          priority={!!isPriority}
          width={parseFloat(width)}
          height={parseFloat(height)}
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

export const LinkRenderer = ({
  href,
  children,
}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  if (!href) return null;

  const isInternalLink = href.startsWith("/") || href.startsWith("#");

  if (isInternalLink) {
    return (
      <Link href={href} className="internalLink">
        {children}
      </Link>
    );
  }
  return <ExternalLink href={href}>{children}</ExternalLink>;
};

export const ParagraphRenderer = ({
  children,
}: HTMLAttributes<HTMLParagraphElement>) => {
  console.log(children);
  const className =
    typeof children === "string" && children.startsWith("–")
      ? "quote-author"
      : "paragraph";
  return <p className={className}>{children}</p>;
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
