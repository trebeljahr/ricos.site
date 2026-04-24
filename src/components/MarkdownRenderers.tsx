import { ImageWithLoader } from "@components/ImageWithLoader";
import clsx from "clsx";
import Link from "next/link";
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { resolveAlt } from "src/lib/imageAlt";
import { CalloutBody, CalloutRoot, CalloutTitle } from "./Callouts";
import { CodeWithCopyButton } from "./CodeCopyButton";
import { ExternalLink } from "./ExternalLink";
import { SimpleGallery } from "./Galleries";

export const ImageRenderer = ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) => {
  if (!src) return null;

  // Strip embedded `/width: X /height: Y /` metadata but keep the rest as
  // an explicit alt if the author wrote one. Fall back to sidecar then
  // filename if they didn't.
  const strippedAlt = alt ? alt.replace(/ *\/[^)]*\/ */g, "").trim() : "";
  const realAlt = resolveAlt(src, strippedAlt);

  const width = alt?.match(/\/width: (.*?)\//)?.pop() || "1";
  const height = alt?.match(/\/height: (.*?)\//)?.pop() || "1";

  const isPriority = alt?.toLowerCase().match("{priority}");
  const hasCaption = alt?.toLowerCase().includes("{caption:");
  const caption = alt?.match(/{caption: (.*?)}/)?.pop();

  return (
    <>
      <span className="block w-full relative my-5 mx-0">
        <ImageWithLoader
          src={src}
          alt={realAlt}
          priority={!!isPriority}
          width={Number.parseFloat(width)}
          height={Number.parseFloat(height)}
          sizes="(max-width: 768px) calc(100vw-24px), 65ch"
          style={{ width: "100%", height: "auto" }}
        />
      </span>
      {hasCaption ? (
        <span className="block caption" aria-label={caption}>
          {caption}
        </span>
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
