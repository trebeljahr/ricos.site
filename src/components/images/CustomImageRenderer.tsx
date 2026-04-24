import { ImageWithLoader } from "@components/ImageWithLoader";
import type { RenderImageContext, RenderImageProps } from "react-photo-album";
import type { ImageProps } from "src/@types";
import { resolveAlt } from "src/lib/imageAlt";

type PhotoWithId = ImageProps & { id: string; index: number; alt?: string };

export function CustomImageRenderer(
  props: RenderImageProps,
  context: RenderImageContext<PhotoWithId>,
) {
  const { photo, width: renderedWidth, height: renderedHeight } = context;

  return (
    <ImageWithLoader
      onClick={props.onClick}
      id={photo.id}
      src={photo.src}
      alt={resolveAlt(photo.src, photo.alt)}
      width={renderedWidth}
      height={renderedHeight}
      sizes={props.sizes}
      style={{ width: "100%", height: "auto" }}
    />
  );
}
