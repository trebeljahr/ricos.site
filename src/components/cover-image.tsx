import Image from "next/image";
import { shimmer, toBase64 } from "src/lib/shimmer";

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
      blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(32, 32))}`}
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
      blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(32, 32))}`}
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
