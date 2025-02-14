import { ImageWithLoader } from "@components/ImageWithLoader";
import { CommonMetadata } from "src/lib/utils";

type Props = {
  title: string;
  priority?: boolean;
  cover: CommonMetadata["cover"];
};

export const PostCoverImage = ({ cover, title, priority = false }: Props) => {
  return (
    <ImageWithLoader
      src={cover.src}
      alt={cover.alt}
      priority={priority}
      sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
        priority ? 768 : 357
      }`}
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
      style={{
        width: "100%",
        height: "auto",
      }}
    />
  );
};
