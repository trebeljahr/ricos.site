import Image from "next/image";

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
      // placeholder="blur"
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
