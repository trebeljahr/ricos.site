import Image from "next/image";
import { RenderPhotoProps } from "react-photo-album";

export function NextJsImage({
  photo,
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps) {
  return (
    <div style={{ ...wrapperStyle, position: "relative" }}>
      <Image
        src={photo}
        fill
        placeholder={"blurDataURL" in photo ? "blur" : undefined}
        {...{ alt, title, className, sizes, onClick }}
      />
    </div>
  );
}
