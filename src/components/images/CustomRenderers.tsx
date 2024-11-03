import { ImageWithLoader } from "@components/ImageWithLoader";
import { RenderPhotoProps } from "react-photo-album";
import { ImageProps } from "src/@types";

export function NextJsImage({
  photo,
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps<ImageProps>) {
  return (
    <div
      style={{ ...wrapperStyle, position: "relative", background: "#f1f3f5" }}
    >
      <ImageWithLoader
        fill
        id={photo.name}
        src={photo}
        priority={photo.index < 3}
        placeholder={"blurDataURL" in photo ? "blur" : undefined}
        {...{ alt, title, sizes, className, onClick }}
      />
    </div>
  );
}
