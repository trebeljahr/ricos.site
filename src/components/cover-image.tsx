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
      sizes="100vw"
      style={{
        objectFit: "cover"
      }} />
  );
};

export const BookCover = ({ title, src }: Props) => {
  return (
    <div className="book-cover-image">
      <Image
        src={src}
        width={1}
        height={1.6}
        // placeholder="blur"
        alt={`Bookcover - ${title}`}
        sizes="100vw"
        style={{
          width: "100%",
          height: "auto"
        }} />
    </div>
  );
};
