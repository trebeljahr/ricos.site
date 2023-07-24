import Image from "next/image";
import { RenderPhotoProps } from "react-photo-album";
import { ImageProps } from "src/utils/types";

export function NextJsImage({
  photo,
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps<ImageProps>) {
  console.log("New Code", sizes);
  return (
    <div
      style={{ ...wrapperStyle, position: "relative", background: "#f1f3f5" }}
    >
      <Image
        fill
        src={photo}
        placeholder={"blurDataURL" in photo ? "blur" : undefined}
        {...{ alt, title, sizes, className, onClick }}
      />
    </div>
  );
}
