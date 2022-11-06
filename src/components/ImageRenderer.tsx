import Image from "next/image";
import { ImgHTMLAttributes } from "react";

export const ImageRenderer = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  if (!props.src) return null;
  return (
    <>
      <span className="markdown-image">
        <Image
          src={props.src}
          layout="responsive"
          width={96}
          height={55}
          objectFit="contain"
          alt={props.alt}
        />
      </span>
    </>
  );
};
