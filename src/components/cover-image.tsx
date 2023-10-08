import Image from "next/image";
import { nextImageUrl } from "src/lib/mapToImageProps";

type Props = {
  title: string;
  src: string;
  priority?: boolean;
  alt?: string;
};

export const PostCoverImage = ({
  src,
  title,
  priority = false,
  alt,
}: Props) => {
  return (
    <Image
      src={src}
      alt={alt || "Cover for post: " + title}
      placeholder="blur"
      blurDataURL={nextImageUrl(src, 16, 1)}
      priority={priority}
      fill
      sizes={`(max-width: 768px) 100vw, (max-width: 1092px) ${
        priority ? 780 : 357
      }`}
      style={{
        objectFit: "cover",
      }}
    />
  );
};

export const BookCover = ({ title, src, priority }: Props) => {
  return (
    <Image
      src={src}
      width={1}
      height={1.6}
      placeholder="blur"
      blurDataURL={nextImageUrl(src, 16, 1)}
      alt={`Bookcover - ${title}`}
      sizes="100vw"
      priority={priority}
      style={{
        width: "100%",
        height: "auto",
      }}
    />
  );
};
