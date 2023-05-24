import Image from "next/image";
import { RenderPhotoProps } from "react-photo-album";
import { ImageProps } from "src/utils/types";

export function NextJsImage({
  photo: { src, blurDataURL },
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps<ImageProps>) {
  return (
    <div style={{ ...wrapperStyle, position: "relative" }}>
      <Image
        src={src}
        fill
        placeholder={blurDataURL ? "blur" : undefined}
        {...{
          alt,
          title,
          className,
          sizes,
          onClick,
          blurDataURL,
        }}
      />
    </div>
  );
}
