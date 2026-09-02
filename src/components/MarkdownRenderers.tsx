import { ImageWithLoader } from "@components/ImageWithLoader";
import clsx from "clsx";
import Link from "next/link";
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { resolveAlt } from "src/lib/imageAlt";
import { CalloutBody, CalloutRoot, CalloutTitle } from "./Callouts";
import { CodeWithCopyButton } from "./CodeCopyButton";
import { ExternalLink } from "./ExternalLink";
import { SimpleGallery, SingleImage } from "./Galleries";

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
          // Measured widths of the `max-w-prose` column (Chromium, 1440x900):
          // <=768px it is `100vw - 24px`, 769-1279px it is 651px (md:prose-lg,
          // 18px base), >=1280px it is 723px (xl:prose-xl, 20px base).
          // `65ch` here used to resolve against the *initial* 16px font, i.e.
          // 520px, not the 723px the column actually renders at — so retina
          // desktop got the 1080 variant for a 1446-device-pixel slot.
          sizes="(max-width: 768px) calc(100vw - 24px), (max-width: 1279px) 651px, 723px"
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
  // Single-photo "groups" need an SSR-rendered path so the browser can
  // reserve layout space at first paint — RowsPhotoAlbum reflows on
  // hydration and produces CLS otherwise.
  if (photos.length === 1) {
    return <SingleImage photo={photos[0]} />;
  }
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
