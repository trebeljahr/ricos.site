import Image from "next/image";
import { RenderPhotoProps } from "react-photo-album";
import { nextImageUrl } from "src/lib/mapToImageProps";
import { ImageProps } from "src/utils/types";

export function NextJsImage({
  photo,
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps<ImageProps>) {
  return (
    <div
      style={{ ...wrapperStyle, position: "relative", background: "#f1f3f5" }}
    >
      <Image
        fill
        src={photo}
        priority={photo.index < 3}
        placeholder="blur"
        blurDataURL={nextImageUrl(photo.src, 16, 1)}
        {...{ alt, title, sizes, className, onClick }}
      />
    </div>
  );
}
