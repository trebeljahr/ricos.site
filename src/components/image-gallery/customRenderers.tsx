import Image from "next/image";
import { RenderPhotoProps } from "react-photo-album";
import { shimmer, toBase64 } from "src/lib/shimmer";
import { ImageProps } from "src/utils/types";

export function NextJsImage({
  photo,
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps<ImageProps>) {
  const blurDataUrl = `data:image/svg+xml;base64,${toBase64(shimmer(32, 32))}`;
  console.log(blurDataUrl);

  return (
    <div
      style={{ ...wrapperStyle, position: "relative", background: "#f1f3f5" }}
    >
      <Image
        fill
        src={photo}
        priority={photo.index < 3}
        placeholder="blur"
        blurDataURL={`data:image/svg+xml;base64,${toBase64(
          shimmer(photo.width, photo.height)
        )}`}
        {...{ alt, title, sizes, className, onClick }}
      />
    </div>
  );
}
