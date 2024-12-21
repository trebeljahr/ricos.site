import { ImageWithLoader } from "@components/ImageWithLoader";
import { RenderPhotoProps } from "react-photo-album";
import { ImageProps } from "src/@types";

export function NextJsImage({
  photo,
  imageProps,
  wrapperStyle,
}: RenderPhotoProps<ImageProps & { id: string; index: number }>) {
  return (
    <div
      key={photo.id}
      className="block relative bg-slate-50"
      style={{ ...wrapperStyle }}
    >
      <ImageWithLoader
        id={photo.id}
        src={photo}
        alt=""
        width={photo.width}
        height={photo.height}
      />
    </div>
  );
}
