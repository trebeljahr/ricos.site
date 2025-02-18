import { ImageWithLoader } from "@components/ImageWithLoader";
import Link from "next/link";
import { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from "react";
import { ExternalLink } from "./ExternalLink";
import { SimpleGallery } from "./Galleries";
import { CodeWithCopyButton } from "./CodeCopyButton";
import clsx from "clsx";
import { CalloutBody, CalloutRoot, CalloutTitle } from "./Callouts";

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
      <div className="w-full relative my-5 mx-0">
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
      </div>
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
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  if (!href) return null;

  const isInternalLink = href.startsWith("/") || href.startsWith("#");

  if (isInternalLink) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <ExternalLink href={href} {...props}>
      {children}
    </ExternalLink>
  );
};

const handleNiceImageGalleries = (props: { images: string }) => {
  const photos = JSON.parse(props.images);

  return <SimpleGallery photos={photos} />;
};

const handleDivs = (props: any) => {
  return <div {...props} className={clsx(props.className, "wrapper")} />;
};

export const MarkdownRenderers = {
  a: LinkRenderer,
  img: ImageRenderer,
  pre: CodeWithCopyButton,
  div: handleDivs,
  SimpleGallery: handleNiceImageGalleries,
  "callout-root": CalloutRoot,
  "callout-title": CalloutTitle,
  "callout-body": CalloutBody,
};
