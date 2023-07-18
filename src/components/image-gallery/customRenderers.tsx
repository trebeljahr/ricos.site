import Image from "next/image";
import { RenderPhotoProps } from "react-photo-album";
import { ImageProps } from "src/utils/types";

export function NextJsImage({
  photo: { src, index },
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps<ImageProps>) {
  return (
    <div
      style={{ ...wrapperStyle, position: "relative", background: "#f1f3f5" }}
    >
      <Image
        src={src}
        fill
        priority={index < 6}
        {...{
          alt,
          title,
          className,
          sizes,
          onClick,
        }}
      />
    </div>
  );
}
