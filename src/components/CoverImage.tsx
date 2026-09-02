import { ImageWithLoader } from "@components/ImageWithLoader";
import type { CommonMetadata } from "src/@types";

type Props = {
  title: string;
  priority?: boolean;
  cover: CommonMetadata["cover"];
};

export const PostCoverImage = ({ cover, _title, priority = false }: Props) => {
  return (
    <ImageWithLoader
      src={cover.src}
      alt={cover.alt}
      priority={priority}
      // `768` / `357` were bare numbers, not lengths, and there was no trailing
      // default size — so the whole attribute was invalid and the browser fell
      // back to 100vw.
      sizes="(max-width: 768px) calc(100vw - 24px), 1024px"
      style={{
        objectFit: "cover",
      }}
      width={cover.width}
      height={cover.height}
    />
  );
};

export const BookCover = ({ title, cover, priority }: Props) => {
  return (
    <ImageWithLoader
      src={cover.src}
      width={cover.width}
      height={cover.height}
      alt={`Bookcover - ${title}`}
      priority={priority}
      // Rendered inside a fixed w-60 (240px) box on the booknote detail page.
      // Without an explicit sizes, next/image defaults to 100vw and pulled the
      // 3840px variant into a 240px slot.
      sizes="240px"
      style={{
        width: "100%",
        height: "auto",
      }}
    />
  );
};
