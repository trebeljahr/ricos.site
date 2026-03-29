import { ImageWithLoader } from "@components/ImageWithLoader";
import { RenderImageProps, RenderImageContext } from "react-photo-album";
import { ImageProps } from "src/@types";

type PhotoWithId = ImageProps & { id: string; index: number };

export function CustomImageRenderer(
  props: RenderImageProps,
  context: RenderImageContext<PhotoWithId>
) {
  const { photo, width: renderedWidth, height: renderedHeight } = context;

  return (
    <ImageWithLoader
      onClick={props.onClick}
      id={photo.id}
      src={photo.src}
      alt={
        photo.src.split("/").pop()?.replace("-", " ") ||
        "sorry but this photo doesn't have an alt text"
      }
      width={renderedWidth}
      height={renderedHeight}
      style={{ width: "100%", height: "auto" }}
    />
  );
}
