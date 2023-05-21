import Image from "next/image";
import { ReactNode } from "react";
import { RenderPhotoProps } from "react-photo-album";
import {
  ContainerRect,
  Render,
  RenderSlideProps,
  Slide,
  isImageFitCover,
  isImageSlide,
  useLightboxProps,
} from "yet-another-react-lightbox";

export function SlideImageWithNext({ slide, rect }: RenderSlideProps) {
  const { imageFit } = useLightboxProps().carousel;

  const cover = isImageSlide(slide) && isImageFitCover(slide, imageFit);

  if (!slide.height || !slide.width) return null;

  const width = !cover
    ? Math.round(
        Math.min(rect.width, (rect.height / slide.height) * slide.width)
      )
    : rect.width;

  const height = !cover
    ? Math.round(
        Math.min(rect.height, (rect.width / slide.width) * slide.height)
      )
    : rect.height;

  return (
    <div style={{ position: "relative", width, height }}>
      <Image
        fill
        alt={slide.alt || "this image doesn't have an alt text, sorry"}
        src={slide.src}
        loading="eager"
        // placeholder="blur"
        draggable={false}
        style={{ objectFit: cover ? "cover" : "contain" }}
        sizes={`${Math.ceil((width / window.innerWidth) * 100)}vw`}
      />
    </div>
  );
}

export function NextJsImage({
  photo,
  imageProps: { alt, title, sizes, className, onClick },
  wrapperStyle,
}: RenderPhotoProps) {
  console.log(photo);

  return (
    <div style={{ ...wrapperStyle, position: "relative" }}>
      <Image
        src={photo}
        fill
        // width={photo.width}
        // height={photo.height}
        placeholder={"blurDataURL" in photo ? "blur" : undefined}
        {...{ alt, title, className, sizes, onClick }}
      />
    </div>
  );
}

export function NextThumbnailRenderer({
  slide,
  rect,
  render,
}: {
  slide: Slide;
  rect: ContainerRect;
  render: Render;
}): ReactNode {
  console.log({ render });
  console.log(rect);
  console.log(slide);

  return (
    <div
      style={{
        width: rect.width,
        height: rect.height,
      }}
    >
      <Image
        fill
        alt={slide.alt || "this image doesn't have an alt text, sorry"}
        src={slide.src}
        loading="eager"
        draggable={false}
        style={{ objectFit: "cover" }}
        sizes={`${Math.ceil((rect.width / window.innerWidth) * 100)}vw`}
      />
    </div>
  );
}
